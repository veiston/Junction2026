"""Foundation checks: contracts import, fakes satisfy the ports, fixture covers all baskets, value objects round-trip."""

from __future__ import annotations

import inspect
from datetime import date

import pytest

from config import Config
from contracts.dto.session import Me  # noqa: F401  (contracts import)
from contracts.dto.transactions import TransactionFilter
from contracts.dto.widgets import Widget  # noqa: F401
from contracts.interfaces.repositories import shared
from models.enums import Basket, Flow
from models.value_objects import Period, YearMonth, format_cents, from_euros, spent
from tests.fakes import (
    FIXTURE_TRANSACTIONS,
    FakeClock,
    FakeConversationRepository,
    FakeCustomerRepository,
    FakeMonthlySpendRepository,
    FakeTransactionRepository,
    fixture_world,
)

CUST = "CUST00001"


def test_contracts_import():
    import contracts.interfaces.controllers.errors  # noqa: F401
    import contracts.interfaces.controllers.services  # noqa: F401
    import contracts.interfaces.llm.ai_tool  # noqa: F401
    import contracts.interfaces.llm.llm_client  # noqa: F401
    import contracts.interfaces.repositories.habits  # noqa: F401
    import contracts.interfaces.repositories.open_data  # noqa: F401


@pytest.mark.parametrize(
    "fake, protocol",
    [
        (FakeClock, shared.Clock),
        (FakeCustomerRepository, shared.CustomerRepository),
        (FakeTransactionRepository, shared.TransactionRepository),
        (FakeMonthlySpendRepository, shared.MonthlySpendRepository),
        (FakeConversationRepository, shared.ConversationRepository),
    ],
)
def test_fake_has_every_port_method_with_same_signature(fake, protocol):
    for name, member in inspect.getmembers(protocol, inspect.isfunction):
        if name.startswith("_"):
            continue
        impl = getattr(fake, name, None)
        assert callable(impl), f"{fake.__name__} lacks {name}"
        assert list(inspect.signature(impl).parameters)[1:] == list(inspect.signature(member).parameters)[1:], name


def test_fakes_behave():
    clock, customers, txs, spend, convs = fixture_world()
    assert clock.today() == date(2026, 9, 15)
    assert customers.get(CUST).region == "Helsinki"
    assert customers.ids_in_group("25-34", "Helsinki") == [CUST]
    assert customers.ids_in_group("25-34", None) == [CUST]
    assert customers.ids_in_group("65+", None) == []

    page = txs.page(CUST, TransactionFilter(), 1, 5)  # current month up to today
    assert [t.date for t in page.items] == sorted((t.date for t in page.items), reverse=True)
    assert all(t.date <= clock.today() for t in page.items)
    assert page.total == txs.sum(CUST, TransactionFilter()).tx_count
    assert txs.balance_on(CUST, date(2026, 8, 1)) == 150000 + 320000
    assert all(t.date <= clock.today() for t in txs.all_between(CUST, date(2026, 1, 1), date(2026, 12, 31)))

    rows = spend.for_customer(CUST, "2026-08", "2026-12")
    assert {r.month for r in rows} == {"2026-08", "2026-09"}
    assert sum(r.tx_count for r in rows) == 29  # two rows after today are hidden

    cid = convs.create(CUST)
    assert convs.owner_of(cid) == CUST and convs.owner_of("nope") is None
    convs.append(cid, "user", "hi")
    convs.append(cid, "assistant", "hello", "[]")
    assert [m.text for m in convs.recent(cid)] == ["hi", "hello"]

    clock.set_today(date(2026, 9, 30))
    assert len(txs.all_between(CUST, date(2026, 9, 1), date(2026, 9, 30))) == 16


def test_fixture_customer_has_all_baskets_and_size():
    assert 25 <= len(FIXTURE_TRANSACTIONS) <= 35
    baskets = {t.basket.value for t in FIXTURE_TRANSACTIONS if t.flow.value == "spending"}
    assert baskets == {b.value for b in Basket}
    assert all(t.basket is None for t in FIXTURE_TRANSACTIONS if t.flow.value != "spending")
    assert {t.flow.value for t in FIXTURE_TRANSACTIONS} == {f.value for f in Flow}


def test_money_round_trip():
    assert from_euros("12.345") == 1235 and from_euros("-0.005") == -1 and from_euros(3) == 300
    for cents in (0, 5, 100, 123456, -9907):
        assert from_euros(format_cents(cents)) == cents
    assert spent(-2500) == 2500


def test_year_month_round_trip():
    assert str(YearMonth.parse("2026-09")) == "2026-09"
    assert YearMonth.parse("2026-12").next() == YearMonth(2027, 1)
    assert YearMonth.of(date(2026, 2, 10)).last_day() == date(2026, 2, 28)
    for bad in ("2026-13", "26-01", "2026-9"):
        with pytest.raises(ValueError):
            YearMonth.parse(bad)


def test_period_and_config():
    today = date(2026, 9, 15)
    assert Period.checked(date(2026, 9, 1), today, today).days == 15
    with pytest.raises(ValueError):
        Period.checked(date(2026, 9, 1), date(2026, 9, 16), today)
    with pytest.raises(ValueError):
        Period.checked(date(2024, 9, 30), today, today)
    c = Config.from_env({})
    assert c.demo_mode is True and c.demo_today == today
    assert Config.from_env({"DEMO_MODE": "false", "DEMO_TODAY": "2026-09-30"}).demo_today == date(2026, 9, 30)
