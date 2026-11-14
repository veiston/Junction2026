"""HTTP tests for /understand/* with the service on the fakes (dependency override)."""

from __future__ import annotations

import pytest

from api.controllers.understand_controller import get_understand_service
from tests.foundation.controllers.conftest import EXPIRED, GOOD, Client, FakeChatService, FakeSessionService, \
    FakeTransactionService, build_app
from tests.understand._builders import make_service


@pytest.fixture
def client():
    services = type("S", (), {"session": FakeSessionService(), "chat": FakeChatService(),
                              "tx": FakeTransactionService()})
    app = build_app(services)
    svc, _ = make_service()
    app.dependency_overrides[get_understand_service] = lambda: svc
    return Client(app)


def get(client, path, token=GOOD, **params):
    return client.get(path, token=token, params=params)


def error_code(resp):
    return resp.json["error"]["code"]


def test_baskets_default_month(client):
    r = get(client, "/understand/baskets")
    assert r.status == 200
    assert r.json["month"] == "2026-09" and r.json["is_partial_month"] is True
    assert [b["basket"] for b in r.json["baskets"]] == ["mandatory_regular", "mandatory_irregular", "everyday"]


def test_baskets_month_switch(client):
    r = get(client, "/understand/baskets", month="2026-08")
    assert r.status == 200 and r.json["is_partial_month"] is False


@pytest.mark.parametrize("month", ["2026-8", "august", "2027-01"])
def test_baskets_bad_month_is_400(client, month):
    r = get(client, "/understand/baskets", month=month)
    assert r.status == 400 and error_code(r) == "VALIDATION_ERROR"


def test_trend_default_and_range(client):
    assert len(get(client, "/understand/trend").json["months"]) == 6
    assert len(get(client, "/understand/trend", months=12).json["months"]) == 12
    for bad in (0, 13):
        r = get(client, "/understand/trend", months=bad)
        assert r.status == 400 and error_code(r) == "VALIDATION_ERROR"


def test_spending_taxis(client):
    r = get(client, "/understand/spending", spend_group="taxis", from_date="2026-08-01", to_date="2026-08-31")
    assert r.status == 200 and r.json["amount_cents"] == 2100 and r.json["label"] == "Taxis"


def test_spending_defaults_to_this_month(client):
    r = get(client, "/understand/spending", basket="everyday")
    assert r.status == 200
    assert (r.json["query"]["from_date"], r.json["query"]["to_date"]) == ("2026-09-01", "2026-09-15")


@pytest.mark.parametrize("params", [
    {},
    {"basket": "everyday", "category": "Restaurants"},
    {"spend_group": "unicorns"},
    {"basket": "everyday", "from_date": "2026-09-10", "to_date": "2026-09-01"},
])
def test_spending_bad_input_is_400(client, params):
    r = get(client, "/understand/spending", **params)
    assert r.status == 400 and error_code(r) == "VALIDATION_ERROR"


def test_profile(client):
    r = get(client, "/understand/profile")
    assert r.status == 200 and r.json["persona"] == "balanced" and len(r.json["traits"]) == 5


def test_benchmark(client):
    r = get(client, "/understand/benchmark", scope="category", key="Groceries")
    assert r.status == 200 and r.json["label"] == "Groceries"
    assert r.json["peer_group"]["region"] == "All regions"


@pytest.mark.parametrize("params", [{}, {"scope": "city", "key": "everyday"}, {"scope": "basket", "key": "food"}])
def test_benchmark_bad_input_is_400(client, params):
    r = get(client, "/understand/benchmark", **params)
    assert r.status == 400 and error_code(r) == "VALIDATION_ERROR"


@pytest.mark.parametrize("path", ["/understand/baskets", "/understand/trend", "/understand/spending",
                                  "/understand/profile", "/understand/benchmark"])
@pytest.mark.parametrize("token,code", [(None, "UNAUTHORIZED"), ("forged", "UNAUTHORIZED"), (EXPIRED, "TOKEN_EXPIRED")])
def test_every_route_needs_a_valid_token(client, path, token, code):
    r = get(client, path, token=token)
    assert r.status == 401 and error_code(r) == code
