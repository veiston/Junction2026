"""One fixture customer with ~30 transactions covering all 3 baskets (Aug-Sep 2026)."""

from __future__ import annotations

from contracts.dto.transactions import Transaction
from contracts.interfaces.repositories.shared import CustomerRecord

CUSTOMER_ID = "CUST00001"
FIXTURE_CUSTOMER = CustomerRecord(
    customer_id=CUSTOMER_ID, postal_code="00100", age=31, age_band="25-34", region="Helsinki"
)

# (date, category, spend_group, label, amount_cents, flow, basket, mcc)
_ROWS: list[tuple[str, str, str, str, int, str, str | None, str | None]] = [
    ("2026-08-01", "Salary", "salary", "Salary", 320000, "income", None, None),
    ("2026-08-02", "Housing", "housing", "Rent / housing", -95000, "spending", "mandatory_regular", None),
    ("2026-08-03", "Utilities", "utilities", "Utilities", -8500, "spending", "mandatory_regular", None),
    ("2026-08-05", "Groceries", "supermarkets", "Supermarkets", -6420, "spending", "mandatory_regular", "5411"),
    ("2026-08-07", "Restaurants", "fast_food_cafes", "Fast food & cafés", -1250, "spending", "everyday", "5814"),
    ("2026-08-09", "Health", "pharmacy", "Pharmacy", -2390, "spending", "mandatory_irregular", "5912"),
    ("2026-08-11", "Transportation", "taxis", "Taxis", -2100, "spending", "everyday", "4121"),
    ("2026-08-12", "Groceries", "supermarkets", "Supermarkets", -5310, "spending", "mandatory_regular", "5411"),
    ("2026-08-14", "Entertainment", "cinemas", "Cinemas", -1800, "spending", "everyday", "7832"),
    ("2026-08-16", "Home & Tech", "hardware", "Hardware", -4590, "spending", "mandatory_irregular", "5251"),
    ("2026-08-18", "Restaurants", "restaurants", "Restaurants", -3850, "spending", "everyday", "5812"),
    ("2026-08-20", "Invest Deposit", "investment_deposit", "Investment deposit", -20000, "saving", None, None),
    ("2026-08-22", "Transportation", "public_transport", "Public transport", -5500, "spending", "mandatory_regular", "4111"),
    ("2026-08-25", "Lifestyle", "clothing", "Clothing", -7900, "spending", "everyday", "5651"),
    ("2026-08-28", "Groceries", "supermarkets", "Supermarkets", -7120, "spending", "mandatory_regular", "5411"),
    ("2026-09-01", "Salary", "salary", "Salary", 320000, "income", None, None),
    ("2026-09-01", "Salary Sweep", "salary_sweep", "Transfer to own account", -50000, "transfer", None, None),
    ("2026-09-02", "Housing", "housing", "Rent / housing", -95000, "spending", "mandatory_regular", None),
    ("2026-09-03", "Utilities", "utilities", "Utilities", -8700, "spending", "mandatory_regular", None),
    ("2026-09-04", "Restaurants", "fast_food_cafes", "Fast food & cafés", -980, "spending", "everyday", "5814"),
    ("2026-09-05", "Groceries", "supermarkets", "Supermarkets", -6840, "spending", "mandatory_regular", "5411"),
    ("2026-09-06", "Transportation", "taxis", "Taxis", -1950, "spending", "everyday", "4121"),
    ("2026-09-08", "Health", "dentists", "Dentists", -12000, "spending", "mandatory_irregular", "8021"),
    ("2026-09-09", "Entertainment", "events_tickets", "Events & tickets", -4500, "spending", "everyday", "7922"),
    ("2026-09-10", "Restaurants", "bars", "Bars", -2800, "spending", "everyday", "5813"),
    ("2026-09-11", "Groceries", "supermarkets", "Supermarkets", -5990, "spending", "mandatory_regular", "5411"),
    ("2026-09-12", "Home & Tech", "electronics", "Electronics", -8900, "spending", "mandatory_irregular", "5732"),
    ("2026-09-14", "Transportation", "fuel", "Fuel", -6100, "spending", "mandatory_regular", "5541"),
    ("2026-09-15", "Restaurants", "fast_food_cafes", "Fast food & cafés", -1120, "spending", "everyday", "5814"),
    # after the demo today: must never be returned
    ("2026-09-20", "Groceries", "supermarkets", "Supermarkets", -6200, "spending", "mandatory_regular", "5411"),
    ("2026-09-25", "Restaurants", "restaurants", "Restaurants", -4100, "spending", "everyday", "5812"),
]


def _build() -> list[Transaction]:
    out: list[Transaction] = []
    balance = 150000
    for i, (day, cat, group, label, cents, flow, basket, mcc) in enumerate(_ROWS, start=1):
        balance += cents
        out.append(
            Transaction(
                id=i,
                date=day,
                timestamp=f"{day}T12:00:00+00:00",
                category=cat,
                spend_group=group,
                label=label,
                amount_cents=cents,
                balance_after_cents=balance,
                flow=flow,
                basket=basket,
                merchant_id=None if mcc is None else f"M{mcc}",
                mcc=mcc,
            )
        )
    return out


FIXTURE_TRANSACTIONS: list[Transaction] = _build()


def fixture_world():
    """Fresh fakes wired to the fixture customer. Returns (clock, customers, transactions, spend, conversations)."""
    from tests.fakes.clock import FakeClock
    from tests.fakes.repositories import (
        FakeConversationRepository,
        FakeCustomerRepository,
        FakeMonthlySpendRepository,
        FakeTransactionRepository,
    )

    clock = FakeClock()
    txs = FakeTransactionRepository(clock, {CUSTOMER_ID: FIXTURE_TRANSACTIONS})
    return (
        clock,
        FakeCustomerRepository([FIXTURE_CUSTOMER]),
        txs,
        FakeMonthlySpendRepository(clock, txs),
        FakeConversationRepository(),
    )
