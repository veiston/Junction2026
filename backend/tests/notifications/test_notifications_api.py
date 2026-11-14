"""The bell end to end: real app, real services, a real SQLite DB built by the real ingest."""

from __future__ import annotations

from datetime import date

import pytest

from adapters.llm.fake_llm import FakeLlm
from api import dependencies as deps
from api.server import create_app
from config import Config
from models.database import Database
from services.container import build_services
from services.ingest_service import ingest_dataset
from tests.foundation._world import CUSTOMERS, write_csvs
from tests.foundation.controllers.conftest import Client

CUSTOMER = "CUST00001"
TODAY = date(2026, 9, 15)
WEEK_ID = "spending-{}-w{:02d}".format(*TODAY.isocalendar()[:2])

# customer, date, category, amount, balance, type, mcc
ROWS = [
    ("CUST00001", "2026-08-01", "Salary", "2500.00", "2500.00", "salary", ""),
    # a typical week (12 Aug - 8 Sep, 4 weeks): 15 EUR of everyday spending each
    ("CUST00001", "2026-08-14", "Restaurants", "-15.00", "2485.00", "purchase", "5812"),
    ("CUST00001", "2026-08-21", "Restaurants", "-15.00", "2470.00", "purchase", "5812"),
    ("CUST00001", "2026-08-28", "Restaurants", "-15.00", "2455.00", "purchase", "5812"),
    ("CUST00001", "2026-09-04", "Restaurants", "-15.00", "2440.00", "purchase", "5812"),
    # the last 7 days (9-15 Sep): 75 EUR, +400 %
    ("CUST00001", "2026-09-10", "Restaurants", "-40.00", "2400.00", "purchase", "5812"),
    ("CUST00001", "2026-09-12", "Restaurants", "-35.00", "2365.00", "purchase", "5812"),
]


@pytest.fixture
def client(tmp_path):
    db = Database(tmp_path / "bell.sqlite3")
    ingest_dataset(db, write_csvs(tmp_path / "data", rows=ROWS, customers=CUSTOMERS))
    config = Config(db_path=str(db.path), jwt_secret="bell-secret")
    services = build_services(config, llm=FakeLlm())
    app = create_app(config)
    # one container, so moving the demo clock moves the bell too
    app.dependency_overrides[deps.get_session_service] = lambda: services.session
    app.dependency_overrides[deps.get_notification_service] = lambda: services.notifications
    return Client(app)


@pytest.fixture
def token(client):
    return client.post("/demo/session", json_body={"customer_id": CUSTOMER}).json["token"]


def unread(client, token):
    resp = client.get("/notifications", token=token)
    assert resp.status == 200, resp.json
    return resp.json


def by_kind(body, kind):
    return [n for n in body["items"] if n["kind"] == kind]


def test_a_big_rise_in_everyday_spending_is_a_notice(client, token):
    body = unread(client, token)
    [notice] = by_kind(body, "spending_change")
    assert notice["id"] == WEEK_ID and notice["tone"] == "warning"
    assert "75 €" in notice["text"] and "400 % more than in a typical week (15 €)" in notice["text"]
    assert "restaurants (+60 €)" in notice["text"]
    assert notice["ask"].startswith("My everyday spending went up this week")
    assert body["unread_count"] == len(body["items"]) >= 1


def test_reading_a_notice_hides_it_for_good(client, token):
    assert by_kind(unread(client, token), "spending_change")
    resp = client.post(f"/notifications/{WEEK_ID}/read", token=token)
    assert resp.status == 204
    assert by_kind(unread(client, token), "spending_change") == []  # not rebuilt: same week, same id
    assert client.post(f"/notifications/{WEEK_ID}/read", token=token).status == 204  # reading twice is fine


def test_unknown_or_malformed_ids(client, token):
    assert client.post("/notifications/nope/read", token=token).status == 404
    assert client.post("/notifications/BAD%20ID/read", token=token).status == 400


def test_challenge_suggestions_come_rarely(client, token):
    first = by_kind(unread(client, token), "challenge_suggestion")
    if not first:
        pytest.skip("no challenge to suggest for this small data set")
    client.post(f"/notifications/{first[0]['id']}/read", token=token)

    client.put("/demo/clock", token=token, json_body={"today": "2026-09-22"})  # one week later
    assert by_kind(unread(client, token), "challenge_suggestion") == []
    # the 14-day rule itself is tested exactly in test_notification_rules.py


def test_the_bell_needs_a_token(client):
    assert client.get("/notifications").status == 401
    assert client.post(f"/notifications/{WEEK_ID}/read").status == 401
