"""Integration: real FastAPI app + real services + a real SQLite DB built by the real ingest.

Only the LLM is scripted (FakeLlm). Every euro amount is cross-checked against plain SQL on the
same database, so the slice is proven to add up on real storage, not just on the fakes.
"""

from __future__ import annotations

import sqlite3

import pytest

from adapters.llm.fake_llm import FakeLlm
from config import Config
from contracts.interfaces.llm.llm_client import LlmTurn, ToolCall
from models.database import Database
from services.ingest_service import ingest_dataset
from services.understand import wiring
from tests.foundation._world import write_csvs
from tests.foundation.e2e.conftest import make_client

CUSTOMER = "CUST00001"
CUSTOMERS = (
    "customer_id,customer_postal_code,customer_age\n"
    "CUST00001,00990,30\nCUST00002,01200,30\nCUST00003,02100,31\nCUST00004,00100,55\n"
)
# customer, date, category, amount, balance, type, mcc
ROWS = [
    ("CUST00001", "2026-07-01", "Salary", "2500.00", "2500.00", "salary", ""),
    ("CUST00001", "2026-07-02", "Housing", "-900.00", "1600.00", "housing_payment", ""),
    ("CUST00001", "2026-07-05", "Groceries", "-55.40", "1544.60", "purchase", "5411"),
    ("CUST00001", "2026-07-12", "Transportation", "-23.10", "1521.50", "purchase", "4121"),
    ("CUST00001", "2026-07-20", "Restaurants", "-41.00", "1480.50", "purchase", "5812"),
    ("CUST00001", "2026-08-01", "Salary", "2500.00", "3980.50", "salary", ""),
    ("CUST00001", "2026-08-02", "Housing", "-900.00", "3080.50", "housing_payment", ""),
    ("CUST00001", "2026-08-03", "Utilities", "-62.30", "3018.20", "utilities_payment", ""),
    ("CUST00001", "2026-08-06", "Groceries", "-71.25", "2946.95", "purchase", "5411"),
    ("CUST00001", "2026-08-09", "Transportation", "-18.40", "2928.55", "purchase", "4121"),
    ("CUST00001", "2026-08-14", "Health", "-34.90", "2893.65", "purchase", "5912"),
    ("CUST00001", "2026-08-22", "Transportation", "-27.75", "2865.90", "purchase", "4121"),
    ("CUST00001", "2026-08-29", "Restaurants", "-12.80", "2853.10", "purchase", "5814"),
    ("CUST00001", "2026-09-01", "Salary", "2500.00", "5353.10", "salary", ""),
    ("CUST00001", "2026-09-02", "Housing", "-900.00", "4453.10", "housing_payment", ""),
    ("CUST00001", "2026-09-04", "Groceries", "-48.60", "4404.50", "purchase", "5411"),
    ("CUST00001", "2026-09-07", "Transportation", "-31.20", "4373.30", "purchase", "4121"),
    ("CUST00001", "2026-09-10", "Restaurants", "-9.50", "4363.80", "purchase", "5814"),
    ("CUST00001", "2026-09-12", "Invest Deposit", "-200.00", "4163.80", "investment_deposit", ""),
    ("CUST00001", "2026-09-20", "Transportation", "-99.00", "4064.80", "purchase", "4121"),  # after today
    ("CUST00002", "2026-08-10", "Restaurants", "-120.00", "1000.00", "purchase", "5812"),
    ("CUST00003", "2026-08-11", "Restaurants", "-60.00", "1000.00", "purchase", "5812"),
]


@pytest.fixture
def db_path(tmp_path):
    db = Database(tmp_path / "understand.sqlite3")
    ingest_dataset(db, write_csvs(tmp_path / "data", rows=ROWS, customers=CUSTOMERS))
    return db.path


@pytest.fixture
def llm():
    return FakeLlm()


@pytest.fixture
def client(db_path, llm):
    # The AI tools have no request: point them at the same test database.
    wiring.configure_tools(Config(db_path=str(db_path)))
    yield make_client(db_path, llm)
    wiring.configure_tools(None)


@pytest.fixture
def token(client):
    resp = client.post("/demo/session", json_body={"customer_id": CUSTOMER})
    assert resp.status == 201
    return resp.json["token"]


def sql_spent(db_path, where: str, *args) -> tuple[int, int]:
    """Plain SQL reference: (positive cents spent, row count) for the customer."""
    with sqlite3.connect(db_path) as con:
        total, count = con.execute(
            "SELECT coalesce(-sum(amount_cents), 0), count(*) FROM transactions "
            f"WHERE customer_id = ? AND flow = 'spending' AND {where}",
            (CUSTOMER, *args),
        ).fetchone()
    return total, count


# ---------------------------------------------------------------- REST on real SQLite
def test_basket_breakdown_equals_sql(client, token, db_path):
    r = client.get("/understand/baskets", token=token)
    assert r.status == 200, r.json
    assert r.json["month"] == "2026-09" and r.json["is_partial_month"] is True
    for b in r.json["baskets"]:
        cents, count = sql_spent(db_path, "basket = ? AND tx_date BETWEEN '2026-09-01' AND '2026-09-15'", b["basket"])
        assert (b["amount_cents"], b["tx_count"]) == (cents, count), b["basket"]
    assert r.json["saving_cents"] == 20000 and r.json["income_cents"] == 250000


def test_previous_month_is_cut_at_the_same_day(client, token, db_path):
    r = client.get("/understand/baskets", token=token)
    everyday = r.json["baskets"][2]
    cents, _ = sql_spent(db_path, "basket = 'everyday' AND tx_date BETWEEN '2026-08-01' AND '2026-08-15'")
    assert everyday["previous_amount_cents"] == cents == 1840


def test_month_switch_full_month(client, token, db_path):
    r = client.get("/understand/baskets", token=token, params={"month": "2026-08"})
    assert r.status == 200 and r.json["is_partial_month"] is False
    total, _ = sql_spent(db_path, "tx_date BETWEEN '2026-08-01' AND '2026-08-31'")
    assert r.json["total_spending_cents"] == total


def test_trend_equals_sql_per_month(client, token, db_path):
    r = client.get("/understand/trend", token=token, params={"months": 3})
    assert [m["month"] for m in r.json["months"]] == ["2026-07", "2026-08", "2026-09"]
    for m in r.json["months"]:
        for b in m["baskets"]:
            cents, _ = sql_spent(db_path, "basket = ? AND substr(tx_date, 1, 7) = ? AND tx_date <= '2026-09-15'",
                                 b["basket"], m["month"])
            assert b["amount_cents"] == cents, (m["month"], b["basket"])


def test_spending_on_taxis_equals_sql(client, token, db_path):
    r = client.get("/understand/spending", token=token,
                   params={"spend_group": "taxis", "from_date": "2026-08-01", "to_date": "2026-08-31"})
    cents, count = sql_spent(db_path, "spend_group = 'taxis' AND tx_date BETWEEN '2026-08-01' AND '2026-08-31'")
    assert (r.json["amount_cents"], r.json["tx_count"]) == (cents, count) == (4615, 2)
    assert [t["amount_cents"] for t in r.json["sample_transactions"]] == [-2775, -1840]
    prev, _ = sql_spent(db_path, "spend_group = 'taxis' AND tx_date BETWEEN '2026-07-01' AND '2026-07-31'")
    assert r.json["previous_period_amount_cents"] == prev


def test_future_rows_are_never_returned(client, token):
    r = client.get("/understand/spending", token=token, params={"spend_group": "taxis", "from_date": "2026-09-01"})
    assert r.json["amount_cents"] == 3120  # the 99 EUR taxi on 2026-09-20 is after today


def test_profile_and_benchmark_on_real_data(client, token):
    p = client.get("/understand/profile", token=token)
    assert p.status == 200 and p.json["persona"] in {"balanced", "steady_planner", "small_leaks",
                                                     "weekend_socialiser", "payday_splurger"}
    b = client.get("/understand/benchmark", token=token, params={"scope": "category", "key": "Groceries"})
    assert b.status == 200
    assert b.json["peer_group"]["region"] == "All regions" and b.json["peer_group"]["size"] == 2
    assert b.json["open_data"]["year"] == 2022  # Statistics Finland reference from db/seed


def test_moving_the_demo_clock_moves_the_slice(client, token):
    assert client.put("/demo/clock", token=token, json_body={"today": "2026-08-20"}).status == 200
    r = client.get("/understand/baskets", token=token)
    assert r.json["month"] == "2026-08" and r.json["source"]["period"]["to_date"] == "2026-08-20"


def test_routes_need_a_token(client):
    assert client.get("/understand/baskets").status == 401


# ---------------------------------------------------------------- chat end-to-end
def test_understand_chip_forces_the_breakdown_tool(client, llm, token):
    llm.push(LlmTurn("", [ToolCall("t1", "get_basket_breakdown", {})], "tool_calls"))
    llm.push(LlmTurn("Most of your money goes to fixed costs.", [], "stop"))
    r = client.post("/chat", token=token, json_body={"quick_action": "understand_my_money"})
    assert r.status == 200, r.json
    assert llm.calls[0]["force_tool"] == "get_basket_breakdown"
    assert [w["type"] for w in r.json["message"]["widgets"]] == ["basket_breakdown"]
    assert r.json["message"]["text"] == "Most of your money goes to fixed costs."
    tool_msg = [m for m in llm.calls[1]["messages"] if m.role == "tool"][0]
    assert CUSTOMER not in tool_msg.text and "tx_date" not in tool_msg.text  # facts only, no raw rows


def test_how_much_on_taxis_last_month(client, llm, token, db_path):
    args = {"spend_group": "taxis", "from_date": "2026-08-01", "to_date": "2026-08-31"}
    llm.push(LlmTurn("", [ToolCall("t1", "get_spending", args)], "tool_calls"))
    llm.push(LlmTurn("You spent 46,15 € on taxis in August.", [], "stop"))
    r = client.post("/chat", token=token, json_body={"message": "How much did I spend on taxis last month?"})
    widget = r.json["message"]["widgets"][0]
    assert widget["type"] == "spending_summary"
    cents, _ = sql_spent(db_path, "spend_group = 'taxis' AND tx_date BETWEEN '2026-08-01' AND '2026-08-31'")
    assert widget["data"]["amount_cents"] == cents


@pytest.mark.parametrize("tool,args,widget", [
    ("get_basket_trend", {"months": 6}, "basket_trend"),
    ("get_spender_profile", {}, "spender_profile"),
    ("compare_with_peers", {"scope": "basket", "key": "everyday"}, "peer_benchmark"),
])
def test_other_questions_return_their_widget(client, llm, token, tool, args, widget):
    llm.push(LlmTurn("", [ToolCall("t1", tool, args)], "tool_calls"))
    llm.push(LlmTurn("Here you go.", [], "stop"))
    r = client.post("/chat", token=token, json_body={"message": "question"})
    assert [w["type"] for w in r.json["message"]["widgets"]] == [widget]
