from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

from tests.foundation.controllers.conftest import EXPIRED, GOOD, Client, build_app

OPENAPI = Path(__file__).resolve().parents[4] / "contracts/interfaces/controllers/http-api.openapi.yaml"
SPEC = yaml.safe_load(OPENAPI.read_text())
OPS = [(m.upper(), p, op) for p, item in SPEC["paths"].items() for m, op in item.items()]

CHAT = {"message": "hello"}
BODIES = {
    "/demo/clock": {"today": "2026-09-01"},
    "/chat": CHAT,
    "/plan/what-if": {},
    "/habits/limits": {},
    "/habits/challenges": {},
}


def concrete(path: str) -> str:
    return path.replace("{limit_id}", "1")


def assert_envelope(resp, status, code):
    assert resp.status == status
    err = resp.json["error"]
    assert err["code"] == code
    assert set(err) == {"code", "message", "details", "request_id"}
    assert re.fullmatch(r"r_\w+", err["request_id"])
    assert resp.headers["x-request-id"] == err["request_id"]


def protected():
    return [(m, p) for m, p, op in OPS if op.get("security") != []]


def slice_ops():
    return [(m, p) for m, p, op in OPS if op["x-owner"] != "foundation"]


def test_every_openapi_operation_is_mounted(app):
    # app.openapi() flattens included routers (newer FastAPI nests them inside app.routes)
    mounted = {(m.upper(), path.removeprefix("/api/v1")) for path, item in app.openapi()["paths"].items() for m in item}
    missing = [(m, p) for m, p, _ in OPS if (m, p) not in mounted]
    assert missing == []


@pytest.mark.parametrize("method,path", protected())
@pytest.mark.parametrize("token", [None, "forged", EXPIRED])
def test_protected_routes_reject_bad_tokens(client, method, path, token):
    resp = client.request(method, concrete(path), token=token, json_body=BODIES.get(path))
    assert_envelope(resp, 401, "TOKEN_EXPIRED" if token == EXPIRED else "UNAUTHORIZED")


@pytest.mark.parametrize("method,path", slice_ops())
def test_slice_routes_are_501(client, method, path):
    resp = client.request(method, concrete(path), token=GOOD, json_body=BODIES.get(path))
    assert_envelope(resp, 501, "NOT_IMPLEMENTED")


def test_health_is_public(client):
    resp = client.get("/health")
    assert resp.status == 200 and resp.json == {"status": "ok", "contracts_version": "1.0.0"}
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert "content-security-policy" in resp.headers


def test_demo_session(client):
    resp = client.post("/demo/session", json_body={"customer_id": "CUST00001"})
    assert resp.status == 201 and resp.json["token"] == GOOD
    assert_envelope(client.post("/demo/session", json_body={"customer_id": "CUST00002"}), 404, "NOT_FOUND")
    assert_envelope(client.post("/demo/session", json_body={"customer_id": "bad"}), 400, "VALIDATION_ERROR")
    assert_envelope(client.post("/demo/session", json_body={"customer_id": "CUST00001", "x": 1}), 400, "VALIDATION_ERROR")


def test_demo_endpoints_forbidden_when_demo_mode_off(services):
    c = Client(build_app(services, demo_mode=False))
    assert_envelope(c.post("/demo/session", json_body={"customer_id": "CUST00001"}), 403, "FORBIDDEN")
    assert_envelope(c.put("/demo/clock", token=GOOD, json_body={"today": "2026-09-01"}), 403, "FORBIDDEN")


def test_clock_get_put_and_range(client):
    assert client.get("/demo/clock", token=GOOD).json == {"today": "2026-09-15"}
    assert client.put("/demo/clock", token=GOOD, json_body={"today": "2026-09-30"}).json == {"today": "2026-09-30"}
    assert_envelope(client.put("/demo/clock", token=GOOD, json_body={"today": "2030-01-01"}), 400, "VALIDATION_ERROR")
    assert_envelope(client.put("/demo/clock", token=GOOD, json_body={"today": "nope"}), 400, "VALIDATION_ERROR")


def test_me(client):
    resp = client.get("/me", token=GOOD)
    assert resp.status == 200 and resp.json["customer_id"] == "CUST00001" and resp.json["currency"] == "EUR"


def test_chat_ok_and_customer_from_token_only(client, services):
    resp = client.post("/chat", token=GOOD, json_body={"message": "  hi  "})
    assert resp.status == 200 and resp.json["conversation_id"] == "c_1"
    cid, req = services.chat.calls[0]
    assert cid == "CUST00001" and req.message == "hi"
    # a customer_id smuggled into the body is rejected, never used
    assert_envelope(client.post("/chat", token=GOOD, json_body={"message": "hi", "customer_id": "CUST99999"}), 400, "VALIDATION_ERROR")
    assert len(services.chat.calls) == 1


@pytest.mark.parametrize("body", [{}, {"message": "a", "quick_action": "x"}, {"message": ""}, {"message": "   "}, {"message": "x" * 1001}])
def test_chat_validation(client, body):
    assert_envelope(client.post("/chat", token=GOOD, json_body=body), 400, "VALIDATION_ERROR")


def test_transactions_defaults_and_filters(client, services):
    resp = client.get("/transactions", token=GOOD)
    assert resp.status == 200 and resp.json["items"] == [] and resp.json["page"] == 1 and resp.json["page_size"] == 20
    client.get("/transactions", token=GOOD, params={"page": 2, "page_size": 5, "flow": "spending", "customer_id": "CUST99999"})
    cid, flt, page, size = services.tx.calls[-1]
    assert (cid, page, size) == ("CUST00001", 2, 5) and flt.flow.value == "spending"


@pytest.mark.parametrize("params", [
    {"page": 0}, {"page_size": 101}, {"basket": "nope"}, {"from_date": "x"},
    {"from_date": "2026-02-01", "to_date": "2026-01-01"}, {"from_date": "2024-10-01", "to_date": "2026-09-01"},
    {"min_abs_amount_cents": -1},
])
def test_transactions_validation(client, params):
    assert_envelope(client.get("/transactions", token=GOOD, params=params), 400, "VALIDATION_ERROR")


def test_unknown_route_and_internal_error_use_envelope(app, services):
    client = Client(app, raise_errors=False)
    assert_envelope(client.get("/nope"), 404, "NOT_FOUND")
    services.tx.list = lambda *a: 1 / 0
    resp = client.get("/transactions", token=GOOD)
    assert_envelope(resp, 500, "INTERNAL_ERROR")
    assert "division" not in resp.json["error"]["message"]


def test_cors_only_configured_origins(client):
    ok = client.request("OPTIONS", "/health", headers={"origin": "http://localhost:5173", "access-control-request-method": "GET"})
    bad = client.request("OPTIONS", "/health", headers={"origin": "http://evil.example", "access-control-request-method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers
