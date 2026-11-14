import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import pytest
from fastapi.testclient import TestClient

from api.dependencies import get_plan_service, get_session_service
from api.server import create_app
from config import Config
from contracts.dto.plan import BalanceForecast, ExpenseAlerts, SafeToSpend, UpcomingBills, WhatIfResult
from contracts.interfaces.controllers.errors import Unauthorized
from tests.plan._world import CUSTOMER_ID, make_service

AUTH = {"Authorization": "Bearer tok"}
PREFIX = "/api/v1/plan"
WHAT_IF_BODY = {"adjustments": [{"target_type": "spend_group", "target": "restaurants", "change_pct": -20}], "horizon_days": 30}


class FakeSessions:
    def verify_token(self, token):
        if token != "tok":
            raise Unauthorized("bad token")
        return CUSTOMER_ID


@pytest.fixture
def client():
    app = create_app(Config())
    app.dependency_overrides[get_session_service] = lambda: FakeSessions()
    app.dependency_overrides[get_plan_service] = lambda: make_service()
    return TestClient(app)


def get(client, path, **params):
    return client.get(f"{PREFIX}{path}", params=params, headers=AUTH)


def what_if(client, change_pct=-20, target="restaurants"):
    adjustment = {"target_type": "spend_group", "target": target, "change_pct": change_pct}
    return client.post(f"{PREFIX}/what-if", json={**WHAT_IF_BODY, "adjustments": [adjustment]}, headers=AUTH)


@pytest.mark.parametrize(
    "path, dto_class",
    [
        ("/forecast", BalanceForecast),
        ("/bills", UpcomingBills),
        ("/alerts", ExpenseAlerts),
        ("/safe-to-spend", SafeToSpend),
    ],
)
def test_get_endpoint_returns_its_dto(client, path, dto_class):
    response = get(client, path)
    assert response.status_code == 200
    dto_class.model_validate(response.json())


def test_what_if_endpoint_returns_its_dto(client):
    response = what_if(client)
    assert response.status_code == 200
    WhatIfResult.model_validate(response.json())


@pytest.mark.parametrize("horizon_days", [30, 60, 90])
def test_forecast_has_one_point_per_day_plus_today(client, horizon_days):
    body = get(client, "/forecast", horizon_days=horizon_days).json()
    assert len(body["points"]) == horizon_days + 1


def test_forecast_defaults_to_thirty_days(client):
    assert get(client, "/forecast").json()["horizon_days"] == 30


def test_bills_default_to_thirty_days(client):
    assert get(client, "/bills").json()["horizon_days"] == 30


@pytest.mark.parametrize("path", ["/forecast", "/bills"])
def test_unsupported_horizon_is_a_validation_error(client, path):
    response = get(client, path, horizon_days=45)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("days", [3, 366])
def test_alert_days_out_of_range_is_a_validation_error(client, days):
    assert get(client, "/alerts", days=days).status_code == 400


def test_what_if_without_change_equals_the_baseline(client):
    body = what_if(client, change_pct=0).json()
    assert body["monthly_saving_cents"] == 0
    assert body["adjusted_end_balance_cents"] == body["baseline_end_balance_cents"]


def test_what_if_with_an_unknown_target_is_a_validation_error(client):
    response = what_if(client, target="yachts")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    "method, path",
    [
        ("GET", "/forecast"),
        ("GET", "/bills"),
        ("GET", "/alerts"),
        ("GET", "/safe-to-spend"),
        ("POST", "/what-if"),
    ],
)
def test_every_endpoint_requires_a_token(client, method, path):
    response = client.request(method, f"{PREFIX}{path}", json=WHAT_IF_BODY)
    assert response.status_code == 401
