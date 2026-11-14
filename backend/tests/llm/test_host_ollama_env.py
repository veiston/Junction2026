import importlib.util
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "host_ollama.py"
PUBLIC_URL = "https://abc-123.ngrok-free.app"


def load_script():
    spec = importlib.util.spec_from_file_location("host_ollama_root", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


host_ollama = load_script()


class FakeNgrokApi(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"tunnels": [
            {"public_url": "http://abc-123.ngrok-free.app"},
            {"public_url": PUBLIC_URL},
        ]}).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def test_reads_the_https_tunnel_address_from_the_ngrok_api():
    server = ThreadingHTTPServer(("127.0.0.1", 0), FakeNgrokApi)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        url = f"http://127.0.0.1:{server.server_address[1]}/api/tunnels"
        assert host_ollama.read_public_url(url, wait_s=2) == PUBLIC_URL
    finally:
        server.shutdown()
        server.server_close()


def test_gives_up_when_ngrok_does_not_answer():
    assert host_ollama.read_public_url("http://127.0.0.1:9/api/tunnels", wait_s=0.5) is None


def test_update_env_file_replaces_adds_and_keeps_other_lines(tmp_path):
    env = tmp_path / ".env"
    env.write_text("GEMINI_API_KEY=keep\n# note\nOLLAMA_BASE_URL=old\n")
    host_ollama.update_env_file(env, {"OLLAMA_BASE_URL": PUBLIC_URL, "OLLAMA_API_KEY": "admin:pw"})
    assert env.read_text().splitlines() == [
        "GEMINI_API_KEY=keep",
        "# note",
        f"OLLAMA_BASE_URL={PUBLIC_URL}",
        "OLLAMA_API_KEY=admin:pw",
    ]


def test_update_env_file_creates_a_missing_file(tmp_path):
    env = tmp_path / ".env"
    host_ollama.update_env_file(env, {"A": "1"})
    assert env.read_text() == "A=1\n"
