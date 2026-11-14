from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

from contracts.interfaces.llm.llm_client import LlmTurn, ToolCall

OPENAPI = Path(__file__).resolve().parents[4] / "contracts/interfaces/controllers/http-api.openapi.yaml"
OPS = [(m.upper(), p, op) for p, item in yaml.safe_load(OPENAPI.read_text())["paths"].items() for m, op in item.items()]
ALL = {"from_date": "2024-10-01"}
BODIES = {"/demo/clock": {"today": "2026-09-01"}, "/chat": {"message": "hello"}}


def test_walking_skeleton(client, llm, token):
    me = client.get("/me", token=token)
    assert me.status == 200 and me.json["customer_id"] == "CUST00001"
    assert me.json["today"] == "2026-09-15"

    llm.push(LlmTurn("", [ToolCall("t1", "list_transactions", {})], "tool_calls"))
    llm.push(LlmTurn("Here are your latest transactions.", [], "stop"))
    chat = client.post("/chat", token=token, json_body={"message": "show my latest transactions"})
    assert chat.status == 200, chat.json
    msg = chat.json["message"]
    assert msg["role"] == "assistant" and msg["text"] == "Here are your latest transactions."
    widgets = [w for w in msg["widgets"] if w["type"] == "transaction_list"]
    assert len(widgets) == 1
    # fixture: CUST00001 has 4 rows on or before 2026-09-15 (the 09-20 row is in the future)
    assert [llm_call["force_tool"] for llm_call in llm.calls] == [None, None]
    assert "2026-09-20" not in str(widgets[0])


def test_transactions_paging_respects_today(client, token):
    p1 = client.get("/transactions", token=token, params={"page": 1, "page_size": 2, **ALL})
    assert p1.status == 200
    assert p1.json["total"] == 4 and len(p1.json["items"]) == 2 and p1.json["page"] == 1
    p2 = client.get("/transactions", token=token, params={"page": 2, "page_size": 2, **ALL})
    assert len(p2.json["items"]) == 2
    ids1 = {i["id"] for i in p1.json["items"]}
    assert not ids1 & {i["id"] for i in p2.json["items"]}
    assert client.get("/transactions", token=token, params={"page": 3, "page_size": 2, **ALL}).json["items"] == []
    # only my rows: CUST00002's 777 EUR purchase must never show up
    assert "77700" not in str(p1.json) + str(p2.json)


def test_clock_put_is_respected(client, token):
    assert client.put("/demo/clock", token=token, json_body={"today": "2026-09-25"}).json == {"today": "2026-09-25"}
    assert client.get("/me", token=token).json["today"] == "2026-09-25"
    assert client.get("/transactions", token=token, params=ALL).json["total"] == 5  # the 09-20 row is now visible
    assert client.put("/demo/clock", token=token, json_body={"today": "2026-09-01"}).status == 200
    assert client.get("/transactions", token=token, params=ALL).json["total"] == 2  # only Aug rows on 09-01


def test_clock_out_of_range_is_400(client, token):
    assert client.put("/demo/clock", token=token, json_body={"today": "2030-01-01"}).status == 400


def test_unknown_customer_session_is_404(client):
    assert client.post("/demo/session", json_body={"customer_id": "CUST99999"}).status == 404


def protected():
    return [(m, p) for m, p, op in OPS if op.get("security") != []]


def test_expired_token_is_401(db_path, llm):
    from datetime import datetime, timedelta, timezone

    from api import dependencies as deps
    from services.container import build_services
    from config import Config
    from tests.foundation.e2e.conftest import make_client

    client = make_client(db_path, llm)
    token = client.post("/demo/session", json_body={"customer_id": "CUST00001"}).json["token"]
    # same secret, but a service whose clock is 2h ahead
    services = build_services(Config(db_path=str(db_path), jwt_secret="e2e-secret"), llm=llm)
    services.session._now = lambda: datetime.now(timezone.utc) + timedelta(hours=2)
    client.app.dependency_overrides[deps.get_session_service] = lambda: services.session
    resp = client.get("/me", token=token)
    assert resp.status == 401 and resp.json["error"]["code"] == "TOKEN_EXPIRED"


@pytest.mark.parametrize("method,path", protected())
@pytest.mark.parametrize("kind", ["none", "forged"])
def test_401_matrix(client, method, path, kind):
    resp = client.request(method, path.replace("{limit_id}", "1"), token=None if kind == "none" else "forged",
                          json_body=BODIES.get(path))
    assert resp.status == 401 and resp.json["error"]["code"] == "UNAUTHORIZED"
    assert re.fullmatch(r"r_\w+", resp.json["error"]["request_id"])


def test_every_slice_route_is_501(client, token):
    slice_ops = [(m, p) for m, p, op in OPS if op["x-owner"] not in ("foundation", "understand", "plan", "habits")]
    if not slice_ops:
        pytest.skip("every slice is built: no 501 stub routes are left")
    for m, p in slice_ops:
        resp = client.request(m, p.replace("{limit_id}", "1"), token=token, json_body=BODIES.get(p))
        assert (resp.status, resp.json["error"]["code"]) == (501, "NOT_IMPLEMENTED"), (m, p)


@pytest.mark.skip(reason="every chip has its tool in the real app now; the coming-soon path is covered by "
                         "test_chip_without_tools_is_coming_soon_and_skips_llm in test_orchestrator.py")
def test_chat_quick_action_chip_says_coming_soon(client, token):
    resp = client.post("/chat", token=token, json_body={"quick_action": "plan_my_finances"})
    # the orchestrator turns a not-yet-built chip into a friendly "coming soon" message (no widgets)
    assert resp.status == 200, resp.json
    assert "coming soon" in resp.json["message"]["text"] and resp.json["message"]["widgets"] == []
