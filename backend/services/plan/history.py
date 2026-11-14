"""One read of the customer's last year, with everything derived from it."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from contracts.dto.common import Period, Source
from contracts.dto.transactions import Transaction
from contracts.interfaces.repositories.shared import TransactionRepository
from services.plan.rates import IRREGULAR_WINDOW_DAYS, DailyRates, daily_rates
from services.plan.schedule import BillRule, Salary, find_salary, predict_bills

SOURCE_DESCRIPTION = "Calculated from your transactions"


@dataclass(frozen=True)
class PlanHistory:
    today: date
    rows: list[Transaction]
    salary: Salary | None
    bills: list[BillRule]
    rates: DailyRates


def load_history(transactions: TransactionRepository, customer_id: str, today: date) -> PlanHistory:
    rows = transactions.all_between(customer_id, today - timedelta(days=IRREGULAR_WINDOW_DAYS), today)
    bills = predict_bills(rows, today)
    bill_groups = {rule.spend_group.value for rule in bills}
    return PlanHistory(
        today=today,
        rows=rows,
        salary=find_salary(rows, today),
        bills=bills,
        rates=daily_rates(rows, today, bill_groups),
    )


def history_source(history: PlanHistory) -> Source:
    period = Period(from_date=history.today - timedelta(days=IRREGULAR_WINDOW_DAYS), to_date=history.today)
    return Source(description=SOURCE_DESCRIPTION, period=period, tx_count=len(history.rows))
