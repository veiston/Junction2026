import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import importlib.util
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "host_ollama.py"
TOKEN = "right-token"
BODY = b'{"prompt": "hi"}'
ANSWER = b'{"answer": "ok"}'
CREATED = 201


def load_script():
    spec = importlib.util.spec_from_file_location("host_ollama", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


host_ollama = load_script()


class FakeUpstream(BaseHTTPRequestHandler):
    received = []

    def do_POST(self):
        length = int(self.headers["Content-Length"])
        self.received.append(self.rfile.read(length))
        self.send_response(CREATED)
        self.send_header("Content-Length", str(len(ANSWER)))
        self.end_headers()
        self.wfile.write(ANSWER)

    def log_message(self, *args):
        pass


def serve(handler):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


@pytest.fixture
def upstream():
    FakeUpstream.received = []
    server = serve(FakeUpstream)
    yield server
    server.shutdown()
    server.server_close()


def start_proxy(upstream_port):
    upstream_url = f"http://127.0.0.1:{upstream_port}"
    return serve(host_ollama.make_proxy_handler(upstream_url, TOKEN))


def post(proxy, authorization=None):
    request = Request(f"http://127.0.0.1:{proxy.server_port}/api/chat", data=BODY, method="POST")
    if authorization:
        request.add_header("Authorization", authorization)
    try:
        with urlopen(request) as response:
            return response.status, response.read()
    except HTTPError as e:
        return e.code, e.read()


def test_request_without_token_is_rejected(upstream):
    proxy = start_proxy(upstream.server_port)
    assert post(proxy)[0] == 401
    assert FakeUpstream.received == []


def test_request_with_wrong_token_is_rejected(upstream):
    proxy = start_proxy(upstream.server_port)
    assert post(proxy, "Bearer wrong")[0] == 401
    assert FakeUpstream.received == []


def test_request_with_right_token_is_forwarded(upstream):
    proxy = start_proxy(upstream.server_port)
    assert post(proxy, f"Bearer {TOKEN}") == (CREATED, ANSWER)
    assert FakeUpstream.received == [BODY]


def test_unreachable_upstream_gives_bad_gateway(upstream):
    port = upstream.server_port
    upstream.shutdown()
    upstream.server_close()
    proxy = start_proxy(port)
    assert post(proxy, f"Bearer {TOKEN}")[0] == 502
