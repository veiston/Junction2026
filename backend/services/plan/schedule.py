"""Payday, expected salary and recurring bills (docs/er.md section 5.2)."""
from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from contracts.dto.common import Basket, Category, Flow, SpendGroup
from contracts.dto.plan import Bill, Confidence, IncomeEvent
from contracts.dto.transactions import Transaction
from services.plan.amounts import median_cents, spent_cents
from services.plan.periods import FULL_MONTHS, date_after, days_ahead, full_month_keys, month_key, monthly_dates

SALARY_STALE_DAYS = 45
FALLBACK_CYCLE_DAYS = 30
SALARY_LABEL = "Salary"
SALARY_SAMPLE_ROWS = 3
MIN_MEDIUM_SALARY_ROWS = 2
BILL_GROUPS = ("housing", "utilities")
MIN_BILL_MONTHS = 2


@dataclass(frozen=True)
class Salary:
    payday_day: int
    amount_cents: int
    confidence: Confidence


@dataclass(frozen=True)
class BillRule:
    label: str
    category: Category
    spend_group: SpendGroup
    basket: Basket
    due_day: int
    amount_cents: int
    confidence: Confidence


def find_salary(rows: list[Transaction], today: date) -> Salary | None:
    """None when there is no salary in the last SALARY_STALE_DAYS days."""
    salary_rows = [row for row in rows if row.spend_group == SpendGroup.salary]
    if not salary_rows:
        return None
    latest = salary_rows[-1]
    if (today - latest.date).days > SALARY_STALE_DAYS:
        return None
    sample = salary_rows[-SALARY_SAMPLE_ROWS:]
    return Salary(
        payday_day=latest.date.day,
        amount_cents=median_cents([row.amount_cents for row in sample]),
        confidence=_salary_confidence(len(sample)),
    )


def _salary_confidence(row_count: int) -> Confidence:
    if row_count >= SALARY_SAMPLE_ROWS:
        return Confidence.high
    if row_count >= MIN_MEDIUM_SALARY_ROWS:
        return Confidence.medium
    return Confidence.low


def next_payday(salary: Salary | None, today: date) -> date:
    if salary is None:
        return days_ahead(today, FALLBACK_CYCLE_DAYS)
    return date_after(salary.payday_day, today)


def income_events(salary: Salary | None, today: date, end: date) -> list[IncomeEvent]:
    if salary is None:
        return []
    return [
        IncomeEvent(label=SALARY_LABEL, date=day, amount_cents=salary.amount_cents, confidence=salary.confidence)
        for day in monthly_dates(salary.payday_day, today, end)
    ]


def predict_bills(rows: list[Transaction], today: date) -> list[BillRule]:
    month_keys = full_month_keys(today)
    rules = []
    for group in BILL_GROUPS:
        group_rows = [row for row in rows if _is_bill_row(row, group, month_keys)]
        rule = _bill_rule(group_rows)
        if rule is not None:
            rules.append(rule)
    return rules


def _is_bill_row(row: Transaction, group: str, month_keys: list[str]) -> bool:
    if row.flow != Flow.spending:
        return False
    if row.spend_group.value != group:
        return False
    return month_key(row.date) in month_keys


def _bill_rule(group_rows: list[Transaction]) -> BillRule | None:
    """group_rows: one bill group inside the full months, oldest first."""
    by_month = defaultdict(list)
    for row in group_rows:
        by_month[month_key(row.date)].append(row)
    if len(by_month) < MIN_BILL_MONTHS:
        return None
    latest = group_rows[-1]
    return BillRule(
        label=latest.label,
        category=latest.category,
        spend_group=latest.spend_group,
        basket=latest.basket,
        due_day=statistics.median_low([month_rows[0].date.day for month_rows in by_month.values()]),
        amount_cents=median_cents([sum(spent_cents(row) for row in month_rows) for month_rows in by_month.values()]),
        confidence=_bill_confidence(len(by_month)),
    )


def _bill_confidence(month_count: int) -> Confidence:
    if month_count == FULL_MONTHS:
        return Confidence.high
    return Confidence.medium


def bills_between(rules: list[BillRule], today: date, end: date) -> list[Bill]:
    """Bills due with today < due_date <= end, sorted by due date."""
    bills = [
        Bill(
            label=rule.label,
            category=rule.category,
            spend_group=rule.spend_group,
            basket=rule.basket,
            due_date=due_date,
            amount_cents=rule.amount_cents,
            confidence=rule.confidence,
        )
        for rule in rules
        for due_date in monthly_dates(rule.due_day, today, end)
    ]
    return sorted(bills, key=lambda bill: bill.due_date)
