"""Small builders for understand tests: synthetic transactions and a service on the fakes."""

from __future__ import annotations

from datetime import date

from contracts.dto.transactions import Transaction
from contracts.interfaces.repositories.shared import CustomerRecord
from services.understand.service import UnderstandServiceImpl
from tests.fakes.clock import FakeClock
from tests.fakes.fixtures import CUSTOMER_ID, FIXTURE_CUSTOMER, FIXTURE_TRANSACTIONS
from tests.fakes.repositories import FakeCustomerRepository, FakeMonthlySpendRepository, FakeTransactionRepository

# spend_group -> (category, basket, label)
GROUPS = {
    "supermarkets": ("Groceries", "mandatory_regular", "Supermarkets"),
    "restaurants": ("Restaurants", "everyday", "Restaurants"),
    "fast_food_cafes": ("Restaurants", "everyday", "Fast food & cafés"),
    "taxis": ("Transportation", "everyday", "Taxis"),
    "bars": ("Restaurants", "everyday", "Bars"),
    "pharmacy": ("Health", "mandatory_irregular", "Pharmacy"),
}


def spend(i: int, day: str, group: str, cents: int, hour: int = 12) -> Transaction:
    category, basket, label = GROUPS[group]
    return Transaction(
        id=i, date=day, timestamp=f"{day}T{hour:02d}:00:00+00:00", category=category, spend_group=group,
        label=label, amount_cents=-abs(cents), balance_after_cents=0, flow="spending", basket=basket,
        merchant_id=None, mcc=None,
    )


def salary(i: int, day: str, cents: int = 300000) -> Transaction:
    return Transaction(
        id=i, date=day, timestamp=f"{day}T06:00:00+00:00", category="Salary", spend_group="salary",
        label="Salary", amount_cents=cents, balance_after_cents=0, flow="income", basket=None,
        merchant_id=None, mcc=None,
    )


def make_service(
    by_customer: dict[str, list[Transaction]] | None = None,
    customers: list[CustomerRecord] | None = None,
    today: date = date(2026, 9, 15),
    open_data=None,
):
    clock = FakeClock(today)
    txs = FakeTransactionRepository(clock, by_customer or {CUSTOMER_ID: FIXTURE_TRANSACTIONS})
    svc = UnderstandServiceImpl(
        txs, FakeMonthlySpendRepository(clock, txs), FakeCustomerRepository(customers or [FIXTURE_CUSTOMER]),
        clock, open_data=open_data,
    )
    return svc, clock
