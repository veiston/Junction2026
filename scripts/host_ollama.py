"""Share a local Ollama model with the team: one command on the machine that has the GPU.

    python3 scripts/host_ollama.py [--model gemma4:e4b] [--port 11435] [--token TOKEN]

Ollama stays bound to localhost. A small proxy in front of it only forwards requests
that carry the right bearer token, and ngrok (when installed) makes the proxy reachable.
"""
from __future__ import annotations

import argparse
import hmac
import json
import secrets
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_MODEL = "gemma4:e4b"
DEFAULT_PORT = 11435
LOCALHOST = "127.0.0.1"
OLLAMA_URL = f"http://{LOCALHOST}:11434"
NGROK_API_URL = f"http://{LOCALHOST}:4040/api/tunnels"
OLLAMA_INSTALL_URL = "https://ollama.com"
NGROK_INSTALL_URL = "https://ngrok.com/download"
TOKEN_BYTES = 32
UPSTREAM_TIMEOUT_S = 300  # a first answer can wait for the model to load
PROBE_TIMEOUT_S = 2
START_WAIT_S = 30
POLL_INTERVAL_S = 0.5
BEARER_PREFIX = "Bearer "
STATUS_UNAUTHORIZED = 401
STATUS_BAD_GATEWAY = 502
SKIPPED_HEADERS = {"authorization", "connection", "transfer-encoding", "content-length", "keep-alive", "host"}


def is_authorized(authorization: str, token: str) -> bool:
    return hmac.compare_digest(authorization.encode(), f"{BEARER_PREFIX}{token}".encode())


def make_proxy_handler(upstream_url: str, token: str) -> type[BaseHTTPRequestHandler]:
    class ProxyHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._proxy()

        def do_POST(self) -> None:
            self._proxy()

        def do_DELETE(self) -> None:
            self._proxy()

        def _proxy(self) -> None:
            body = self._read_body()
            if not is_authorized(self.headers.get("Authorization", ""), token):
                self._reply(STATUS_UNAUTHORIZED, b'{"error": "unauthorized"}')
                return
            try:
                status, answer = self._forward(body)
            except OSError:
                self._reply(STATUS_BAD_GATEWAY, b'{"error": "ollama unreachable"}')
                return
            self._reply(status, answer)

        def _read_body(self) -> bytes:
            length = int(self.headers.get("Content-Length") or 0)
            return self.rfile.read(length)

        def _forward(self, body: bytes) -> tuple[int, bytes]:
            headers = {
                name: value for name, value in self.headers.items()
                if name.lower() not in SKIPPED_HEADERS
            }
            request = urllib.request.Request(
                upstream_url + self.path, data=body or None, headers=headers, method=self.command
            )
            try:
                with urllib.request.urlopen(request, timeout=UPSTREAM_TIMEOUT_S) as response:
                    return response.status, response.read()
            except urllib.error.HTTPError as e:
                return e.code, e.read()

        def _reply(self, status: int, body: bytes) -> None:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return ProxyHandler


def is_answering(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=PROBE_TIMEOUT_S):
            return True
    except OSError:
        return False


def wait_until_answering(url: str) -> bool:
    deadline = time.monotonic() + START_WAIT_S
    while time.monotonic() < deadline:
        if is_answering(url):
            return True
        time.sleep(POLL_INTERVAL_S)
    return False


def start_ollama_if_needed() -> subprocess.Popen | None:
    if is_answering(OLLAMA_URL):
        print("Ollama is already running.")
        return None
    print("Starting 'ollama serve' (localhost only)...")
    process = subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not wait_until_answering(OLLAMA_URL):
        process.terminate()
        raise SystemExit("Ollama did not start. Try 'ollama serve' in another terminal.")
    return process


def read_public_url() -> str | None:
    if not wait_until_answering(NGROK_API_URL):
        return None
    with urllib.request.urlopen(NGROK_API_URL, timeout=PROBE_TIMEOUT_S) as response:
        tunnels = json.load(response)["tunnels"]
    for tunnel in tunnels:
        if tunnel["public_url"].startswith("https://"):
            return tunnel["public_url"]
    return None


def start_ngrok(port: int) -> tuple[subprocess.Popen, str | None]:
    process = subprocess.Popen(["ngrok", "http", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return process, read_public_url()


def print_env_lines(base_url: str, token: str) -> None:
    print("\nPaste these two lines into your .env:\n")
    print(f"OLLAMA_BASE_URL={base_url}")
    print(f"OLLAMA_API_KEY={token}")


def share(port: int, token: str, children: list[subprocess.Popen]) -> None:
    local_url = f"http://{LOCALHOST}:{port}"
    if shutil.which("ngrok") is None:
        print(f"ngrok is not installed, so only this machine can reach the proxy ({NGROK_INSTALL_URL}).")
        print_env_lines(local_url, token)
        return
    print("Step 4/4: opening the ngrok tunnel...")
    process, public_url = start_ngrok(port)
    children.append(process)
    if public_url is None:
        print("Could not read the ngrok URL. Run 'ngrok config add-authtoken <token>' once, then retry.")
        print_env_lines(local_url, token)
        return
    print_env_lines(public_url, token)


def stop_children(children: list[subprocess.Popen]) -> None:
    for process in children:
        process.terminate()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Host a local Ollama model behind a token.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--token", default=None, help="default: a new random token per run")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = args.token or secrets.token_urlsafe(TOKEN_BYTES)
    if shutil.which("ollama") is None:
        print(f"Ollama is not installed. Install it from {OLLAMA_INSTALL_URL} and run this again.")
        raise SystemExit(1)
    children: list[subprocess.Popen] = []
    print("Step 1/4: checking Ollama...")
    server = start_ollama_if_needed()
    if server is not None:
        children.append(server)
    print(f"Step 2/4: pulling {args.model} (first time can take a while)...")
    subprocess.run(["ollama", "pull", args.model], check=True)
    print(f"Step 3/4: starting the token proxy on {LOCALHOST}:{args.port}...")
    proxy = ThreadingHTTPServer((LOCALHOST, args.port), make_proxy_handler(OLLAMA_URL, token))
    try:
        share(args.port, token, children)
        print("\nRunning. Press Ctrl+C to stop.")
        proxy.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        proxy.server_close()
        stop_children(children)


if __name__ == "__main__":
    main()
