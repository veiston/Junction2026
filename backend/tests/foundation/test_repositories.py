"""Contract tests: the SAME test body runs against the fake and the SQLite repositories."""

from __future__ import annotations

import json
from datetime import date

import pytest

from contracts.dto.transactions import TransactionFilter
from tests.fakes.clock import FakeClock
from tests.fakes.fixtures import CUSTOMER_ID, fixture_world
from tests.foundation._world import sqlite_world

OTHER = "CUST_OTHER"


@pytest.fixture(params=["fake", "sqlite"])
def world(request, tmp_path):
    """(clock, customers, transactions, spend, conversations, customer_id, other_customer_id)."""
    if request.param == "fake":
        clock, cust, tx, spend, conv = fixture_world()
        return clock, cust, tx, spend, conv, CUSTOMER_ID, "CUST99999"
    clock, cust, tx, spend, conv, _ = sqlite_world(tmp_path)
    return clock, cust, tx, spend, conv, "CUST00001", "CUST00002"


def test_page_is_newest_first_and_cut_at_today(world):
    clock, _, tx, _, _, cid, _ = world
    flt = TransactionFilter(from_date=date(2026, 8, 1))
    page = tx.page(cid, flt, 1, 100)
    assert page.items[0].date <= clock.today()
    assert [t.timestamp for t in page.items] == sorted((t.timestamp for t in page.items), reverse=True)
    assert page.total == len(page.items)
    assert page.total_amount_cents == sum(t.amount_cents for t in page.items)


def test_page_beyond_end_is_empty(world):
    _, _, tx, _, _, cid, _ = world
    page = tx.page(cid, TransactionFilter(from_date=date(2026, 8, 1)), 50, 20)
    assert page.items == [] and page.total > 0


def test_sum_matches_filter(world):
    _, _, tx, _, _, cid, _ = world
    res = tx.sum(cid, TransactionFilter(from_date=date(2026, 8, 1), flow="spending"))
    assert res.amount_cents < 0 and res.tx_count > 0


def test_no_future_rows_after_clock_moves_back(world):
    clock, _, tx, _, _, cid, _ = world
    clock.set_today(date(2026, 9, 1))
    rows = tx.all_between(cid, date(2026, 8, 1), date(2026, 9, 30))
    assert rows and all(t.date <= date(2026, 9, 1) for t in rows)


def test_all_between_oldest_first(world):
    _, _, tx, _, _, cid, _ = world
    rows = tx.all_between(cid, date(2026, 8, 1), date(2026, 9, 30))
    assert [t.timestamp for t in rows] == sorted(t.timestamp for t in rows)


def test_balance_on(world):
    _, _, tx, _, _, cid, _ = world
    assert tx.balance_on(cid, date(2026, 9, 30)) == tx.balance_on(cid, date(2026, 9, 15))
    assert tx.balance_on(cid, date(2000, 1, 1)) == 0


def test_monthly_spend_cut_at_today(world):
    _, _, _, spend, _, cid, _ = world
    rows = spend.for_customer(cid, "2026-08", "2026-12")
    assert {r.month for r in rows} == {"2026-08", "2026-09"}
    sep = [r for r in rows if r.month == "2026-09" and r.flow == "spending"]
    assert all(r.amount_cents < 0 for r in sep)
    pairs = spend.for_customers([cid], "2026-08", "2026-09")
    assert [r for _, r in pairs] == rows


def test_other_customer_rows_never_leak(world):
    _, _, tx, spend, _, cid, other = world
    flt = TransactionFilter(from_date=date(2026, 8, 1))
    mine = {t.id for t in tx.page(cid, flt, 1, 100).items}
    theirs = {t.id for t in tx.page(other, flt, 1, 100).items}
    assert not mine & theirs
    assert not {t.id for t in tx.all_between(other, date(2026, 8, 1), date(2026, 9, 30))} & mine
    assert all(c == other for c, _ in spend.for_customers([other], "2026-08", "2026-09"))


def test_customer_repo(world):
    _, cust, _, _, _, cid, other = world
    assert cust.get(cid).customer_id == cid
    assert cust.get("nope") is None
    band = cust.get(cid).age_band
    assert cid in cust.ids_in_group(band, None)
    assert cid in cust.ids_in_group(band, cust.get(cid).region)


def test_conversations(world):
    _, _, _, _, conv, cid, other = world
    c = conv.create(cid)
    assert conv.owner_of(c) == cid and conv.owner_of(c) != other
    assert conv.owner_of("c_missing") is None
    conv.append(c, "user", "hi")
    conv.append(c, "assistant", "hello", json.dumps([{"a": 1}]))
    conv.append(c, "user", "again")
    recent = conv.recent(c, 2)
    assert [m.text for m in recent] == ["hello", "again"]
    assert recent[0].widgets_json == '[{"a": 1}]' and recent[1].widgets_json == "[]"


def test_sqlite_clock_rejects_out_of_range():
    from models.repositories.clock import DemoClock
    clock = DemoClock(date(2026, 9, 15), max_date=date(2026, 9, 30))
    clock.set_today(date(2026, 9, 30))
    for bad in (date(2026, 10, 1), date(2024, 9, 30)):
        with pytest.raises(ValueError):
            clock.set_today(bad)
    assert clock.today() == date(2026, 9, 30)
