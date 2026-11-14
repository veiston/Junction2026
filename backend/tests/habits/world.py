"""Small hand-made world for habits tests: one customer, everyday spending in Jun-Sep 2026."""

from __future__ import annotations

from datetime import date

from contracts.dto.transactions import Transaction
from services.habits.service import HabitsServiceImpl
from tests.fakes import FakeClock, FakeTransactionRepository
from tests.habits.fakes import FakeChallengeRepository, FakeLimitRepository

ME, OTHER = "CUST00001", "CUST00002"
LABELS = {"taxis": "Taxis", "bars": "Bars", "fast_food_cafes": "Fast food & cafés", "supermarkets": "Supermarkets",
          "cinemas": "Cinemas"}
CATEGORY = {"taxis": "Transportation", "bars": "Restaurants", "fast_food_cafes": "Restaurants",
            "supermarkets": "Groceries", "cinemas": "Entertainment"}


def tx(i: int, day: str, group: str, cents: int, basket: str | None = "everyday") -> Transaction:
    return Transaction(
        id=i, date=day, timestamp=f"{day}T12:00:00+00:00", category=CATEGORY[group], spend_group=group,
        label=LABELS[group], amount_cents=-cents, balance_after_cents=100000, flow="spending", basket=basket,
        merchant_id=None, mcc=None,
    )


def rows_for(customer_id: str) -> list[Transaction]:
    out: list[Transaction] = []
    n = 0

    def add(day, group, cents, basket="everyday"):
        nonlocal n
        n += 1
        out.append(tx(n, day, group, cents, basket))

    # Jun: 30000, Jul: 40000, Aug: 50000 everyday -> average 40000
    add("2026-06-10", "bars", 30000)
    add("2026-07-10", "bars", 40000)
    # Aug: 5 taxi rides (zero_spend candidate), bars, cinemas (max_amount candidate)
    for d in ("2026-08-02", "2026-08-09", "2026-08-16", "2026-08-23", "2026-08-30"):
        add(d, "taxis", 4000)
    add("2026-08-12", "bars", 25000)
    add("2026-08-20", "cinemas", 5000)
    add("2026-08-21", "supermarkets", 99999, "mandatory_regular")  # not everyday
    # Sep (today = 15th): 1st-15th
    add("2026-09-03", "bars", 6000)
    add("2026-09-10", "taxis", 2500)
    add("2026-09-20", "bars", 77700)  # after today
    return out


def make_world(today: date = date(2026, 9, 15)):
    clock = FakeClock(today)
    txs = FakeTransactionRepository(clock, {ME: rows_for(ME), OTHER: [tx(1, "2026-09-02", "bars", 77700)]})
    limits, challenges = FakeLimitRepository(), FakeChallengeRepository()
    return HabitsServiceImpl(limits, challenges, txs, clock), clock, limits, challenges
