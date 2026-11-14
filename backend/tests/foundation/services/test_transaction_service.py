from datetime import date

import pytest

from contracts.dto.transactions import TransactionFilter
from contracts.interfaces.controllers.errors import ValidationFailed
from services.transaction_service import TransactionServiceImpl
from tests.fakes import fixture_world

CID = "CUST00001"


@pytest.fixture
def svc():
    clock, _, txs, _, _ = fixture_world()
    return TransactionServiceImpl(txs, clock)


def test_default_is_current_month_newest_first_no_future(svc):
    p = svc.list(CID, TransactionFilter(), 1, 100)
    assert all(t.date <= date(2026, 9, 15) and t.date.month == 9 for t in p.items)
    assert p.items[0].date == date(2026, 9, 15)
    assert p.total == len(p.items)
    assert p.total_amount_cents == sum(t.amount_cents for t in p.items)


def test_filters(svc):
    p = svc.list(CID, TransactionFilter(from_date=date(2026, 8, 1), to_date=date(2026, 8, 31), category="Groceries"), 1, 20)
    assert p.total == 3 and {t.category.value for t in p.items} == {"Groceries"}
    assert p.total_amount_cents == -(6420 + 5310 + 7120)
    big = svc.list(CID, TransactionFilter(from_date=date(2026, 8, 1), min_abs_amount_cents=50000), 1, 20)
    assert all(abs(t.amount_cents) >= 50000 for t in big.items) and big.total >= 3


def test_paging_totals_cover_all_pages(svc):
    flt = TransactionFilter(from_date=date(2026, 8, 1))
    p1 = svc.list(CID, flt, 1, 10)
    p2 = svc.list(CID, flt, 2, 10)
    assert len(p1.items) == 10 and p1.total == p2.total
    assert p1.total_amount_cents == p2.total_amount_cents
    assert {t.id for t in p1.items}.isdisjoint(t.id for t in p2.items)
    assert svc.list(CID, flt, 99, 10).items == []


def test_other_customer_sees_nothing(svc):
    assert svc.list("CUST00002", TransactionFilter(from_date=date(2026, 8, 1)), 1, 10).total == 0


@pytest.mark.parametrize(
    "flt,page,size",
    [
        (TransactionFilter(), 0, 10),
        (TransactionFilter(), 1, 101),
        (TransactionFilter(from_date=date(2026, 9, 2), to_date=date(2026, 9, 1)), 1, 10),
        (TransactionFilter(from_date=date(2024, 9, 1)), 1, 10),
        (TransactionFilter(from_date=date(2026, 9, 16)), 1, 10),
        (TransactionFilter(from_date=date(2025, 1, 1), to_date=date(2026, 9, 1)), 1, 10),
    ],
)
def test_validation(svc, flt, page, size):
    with pytest.raises(ValidationFailed):
        svc.list(CID, flt, page, size)
