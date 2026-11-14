"""A customer with six months of history ending at today (2026-09-15), wired to the fakes."""

from __future__ import annotations

from datetime import date

from contracts.dto.transactions import Transaction
from services.plan.plan_service import PlanServiceImpl
from tests.fakes import FakeClock, FakeMonthlySpendRepository, FakeTransactionRepository

CUSTOMER_ID = "CUST00001"
TODAY = date(2026, 9, 15)
START_BALANCE = 500000
FIRST_MONTH = 3
LAST_MONTH = 9
SALARY_CENTS = 300000
RENT_CENTS = 90000

# group -> (category, label, flow, basket)
_GROUPS = {
    "salary": ("Salary", "Salary", "income", None),
    "housing": ("Housing", "Rent / housing", "spending", "mandatory_regular"),
    "utilities": ("Utilities", "Utilities", "spending", "mandatory_regular"),
    "supermarkets": ("Groceries", "Supermarkets", "spending", "mandatory_regular"),
    "restaurants": ("Restaurants", "Restaurants", "spending", "everyday"),
    "taxis": ("Transportation", "Taxis", "spending", "everyday"),
    "pharmacy": ("Health", "Pharmacy", "spending", "mandatory_irregular"),
    "dentists": ("Health", "Dentists", "spending", "mandatory_irregular"),
}

Entry = tuple[date, str, int]  # (day, spend_group, signed cents)


def _monthly(day: int, group: str, cents: int) -> list[Entry]:
    return [(date(2026, month, day), group, cents) for month in range(FIRST_MONTH, LAST_MONTH + 1)]


def standard_entries() -> list[Entry]:
    entries = _monthly(28, "salary", SALARY_CENTS)
    entries += _monthly(20, "housing", -RENT_CENTS)
    entries += _monthly(5, "utilities", -8500)
    for day in (3, 10, 17, 24):
        entries += _monthly(day, "supermarkets", -6000)
    for day in (7, 14, 21):
        entries += _monthly(day, "restaurants", -3000)
    entries += _monthly(12, "taxis", -2000)
    entries += [
        (date(2026, 7, 9), "pharmacy", -2500),
        (date(2026, 5, 14), "dentists", -12000),
        (date(2026, 9, 10), "restaurants", -60000),  # the big outlier
        (date(2026, 9, 12), "restaurants", -12000),
    ]
    return [entry for entry in entries if entry[0] <= TODAY]


def make_service(entries: list[Entry] | None = None, start_balance: int = START_BALANCE) -> PlanServiceImpl:
    if entries is None:
        entries = standard_entries()
    clock = FakeClock(TODAY)
    transactions = FakeTransactionRepository(clock, {CUSTOMER_ID: _build_rows(entries, start_balance)})
    return PlanServiceImpl(transactions, FakeMonthlySpendRepository(clock, transactions), clock)


def _build_rows(entries: list[Entry], start_balance: int) -> list[Transaction]:
    rows = []
    balance = start_balance
    for row_id, (day, group, cents) in enumerate(sorted(entries), start=1):
        category, label, flow, basket = _GROUPS[group]
        balance += cents
        rows.append(
            Transaction(
                id=row_id,
                date=day,
                timestamp=f"{day}T12:00:00+00:00",
                category=category,
                spend_group=group,
                label=label,
                amount_cents=cents,
                balance_after_cents=balance,
                flow=flow,
                basket=basket,
                merchant_id=None,
                mcc=None,
            )
        )
    return rows
