from datetime import date, datetime, timedelta, timezone

import jwt
import pytest

from contracts.interfaces.controllers.errors import NotFound, TokenExpired, Unauthorized, ValidationFailed
from services.session_service import SessionServiceImpl
from tests.fakes import FakeClock, FakeCustomerRepository, FIXTURE_CUSTOMER

SECRET = "s3cret"
T0 = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)


class Now:
    def __init__(self):
        self.t = T0

    def __call__(self):
        return self.t


@pytest.fixture
def now():
    return Now()


@pytest.fixture
def svc(now):
    return SessionServiceImpl(FakeCustomerRepository([FIXTURE_CUSTOMER]), FakeClock(), SECRET, now)


def test_valid_token_roundtrip(svc):
    tok = svc.create_demo_session("CUST00001")
    assert tok.expires_at == T0 + timedelta(minutes=60)
    assert svc.verify_token(tok.token) == "CUST00001"


def test_unknown_customer(svc):
    with pytest.raises(NotFound):
        svc.create_demo_session("CUST99999")


def test_expired(svc, now):
    tok = svc.create_demo_session("CUST00001")
    now.t = T0 + timedelta(minutes=61)
    with pytest.raises(TokenExpired):
        svc.verify_token(tok.token)


def test_forged_signature(svc):
    bad = jwt.encode({"sub": "CUST00001", "aud": "s-money-coach", "exp": 9999999999}, "other", algorithm="HS256")
    with pytest.raises(Unauthorized):
        svc.verify_token(bad)


def test_wrong_audience(svc):
    bad = jwt.encode({"sub": "CUST00001", "aud": "someone-else", "exp": 9999999999}, SECRET, algorithm="HS256")
    with pytest.raises(Unauthorized):
        svc.verify_token(bad)


def test_garbage_and_alg_none(svc):
    with pytest.raises(Unauthorized):
        svc.verify_token("not.a.jwt")
    none_tok = jwt.encode({"sub": "CUST00001", "aud": "s-money-coach", "exp": 9999999999}, None, algorithm="none")
    with pytest.raises(Unauthorized):
        svc.verify_token(none_tok)


def test_me_and_clock(svc):
    me = svc.me("CUST00001")
    assert me.customer_id == "CUST00001" and me.age_band.value == "25-34" and me.today == date(2026, 9, 15)
    assert svc.set_clock(date(2026, 8, 31)).today == date(2026, 8, 31)
    assert svc.get_clock().today == date(2026, 8, 31)
    assert svc.me("CUST00001").today == date(2026, 8, 31)
    with pytest.raises(NotFound):
        svc.me("CUST99999")


@pytest.mark.parametrize("d", [date(2024, 9, 30), date(2026, 10, 1)])
def test_set_clock_out_of_range(svc, d):
    with pytest.raises(ValidationFailed):
        svc.set_clock(d)
