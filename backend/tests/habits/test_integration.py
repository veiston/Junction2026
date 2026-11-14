"""Real app, real services, real SQLite database; only the language model is scripted."""

from __future__ import annotations

import pytest

from adapters.llm.fake_llm import FakeLlm
from api import dependencies as deps
from api.server import create_app
from config import Config
from contracts.interfaces.llm.llm_client import LlmTurn, ToolCall
from models.database import Database
from services.container import build_services
from services.ingest_service import ingest_dataset
from tests.foundation._world import ROWS, write_csvs
from tests.foundation.controllers.conftest import Client


@pytest.fixture
def llm():
    return FakeLlm()


@pytest.fixture
def client(tmp_path, llm):
    db = Database(tmp_path / "habits.sqlite3")
    august = [("CUST00001", f"2026-08-{day:02d}", "Restaurants", "-20.00", "2000.00", "purchase", "5812")
              for day in (3, 10, 17, 24)]
    taxis = [("CUST00001", day, "Transportation", amount, "2000.00", "purchase", "4121")
             for day, amount in (("2026-08-25", "-30.00"), ("2026-09-09", "-30.00"), ("2026-09-12", "-35.00"))]
    ingest_dataset(db, write_csvs(tmp_path / "data", rows=[*ROWS, *august, *taxis]))
    config = Config(db_path=str(db.path), jwt_secret="habits-secret")
    services = build_services(config, llm=llm)
    app = create_app(config)
    app.dependency_overrides[deps.get_session_service] = lambda: services.session
    app.dependency_overrides[deps.get_chat_service] = lambda: services.chat
    app.dependency_overrides[deps.get_transaction_service] = lambda: services.transactions
    app.dependency_overrides[deps.get_habits_service] = lambda: services.habits
    return Client(app)


def login(client, customer="CUST00001"):
    resp = client.post("/demo/session", json_body={"customer_id": customer})
    assert resp.status == 201
    return resp.json["token"]


@pytest.fixture
def token(client):
    return login(client)


def test_chip_forces_challenge_suggestions_widget(client, llm, token):
    llm.push(LlmTurn("", [ToolCall("t1", "suggest_challenges", {})], "tool_calls"))
    llm.push(LlmTurn("Here is one habit you could test.", [], "stop"))
    resp = client.post("/chat", token=token, json_body={"quick_action": "improve_my_habits"})
    assert resp.status == 200, resp.json
    msg = resp.json["message"]
    assert "coming soon" not in msg["text"] and msg["text"] == "Here is one habit you could test."
    assert [w["type"] for w in msg["widgets"]] == ["challenge_suggestions"]
    item = msg["widgets"][0]["data"]["items"][0]
    assert item["id"] == "max_amount_taxis_7d" and item["baseline_cents"] == 6500 and item["baseline_count"] == 2
    assert item["rule"]["amount_cents"] == 3200 and item["concept"]["id"] == "compare_equal_periods"
    assert llm.calls[0]["force_tool"] == "suggest_challenges"
    assert "CUST00001" not in str(llm.calls[1]["messages"][-1])  # the model never sees the customer id


def test_the_assistant_does_not_offer_the_monthly_limit(client, llm, token):
    llm.push(LlmTurn("", [ToolCall("t1", "suggest_monthly_limit", {})], "tool_calls"))
    resp = client.post("/chat", token=token, json_body={"message": "suggest a monthly limit"})
    assert resp.status == 200, resp.json
    assert resp.json["message"]["widgets"] == []


def test_http_requires_token(client):
    assert client.get("/habits/limit-suggestion").status == 401
    assert client.post("/habits/limits", json_body={"month": "2026-09", "amount_cents": 30000}).status == 401
    assert client.get("/habits/challenges", token="forged").status == 401


def test_limit_conflict_and_not_found(client, token):
    assert client.get("/habits/limits/current", token=token).status == 404
    body = {"month": "2026-09", "amount_cents": 30000}
    first = client.post("/habits/limits", token=token, json_body=body)
    assert first.status == 201 and first.json["month"] == "2026-09"
    second = client.post("/habits/limits", token=token, json_body=body)
    assert second.status == 409 and second.json["error"]["code"] == "CONFLICT"
    assert client.get("/habits/limits/current", token=token).json["spent_cents"] == 7750  # Sep 2 restaurant 12.50 and two taxi rides 65.00 up to Sep 15
    assert client.get("/habits/limits/9999/review", token=token).status == 404


def test_other_customers_limit_review_is_404(client, token):
    created = client.post("/habits/limits", token=token, json_body={"month": "2026-09", "amount_cents": 30000})
    other = login(client, "CUST00002")
    assert client.get(f"/habits/limits/{created.json['id']}/review", token=other).status == 404
    assert client.get(f"/habits/limits/{created.json['id']}/review", token=token).status == 200
    assert client.get("/habits/limits/current", token=other).status == 404


def test_challenge_http_flow(client, token):
    sug = client.get("/habits/challenges/suggestions", token=token)
    assert sug.status == 200 and len(sug.json["items"]) <= 3
    template = sug.json["items"][0]["id"]
    assert template == "max_amount_taxis_7d"  # 3 taxi rides in 28 days, 2 of them in the baseline week
    assert client.post("/habits/challenges", token=token, json_body={"template_id": template}).status == 201
    assert client.post("/habits/challenges", token=token, json_body={"template_id": template}).status == 409
    assert client.post("/habits/challenges", token=token, json_body={"template_id": "max_amount_nope_7d"}).status == 404
    listed = client.get("/habits/challenges", token=token).json["items"]
    assert [i["challenge"]["template_id"] for i in listed] == [template]
