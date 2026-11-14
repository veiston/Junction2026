"""Unusually large purchases compared with the customer's own history."""
from __future__ import annotations

from datetime import date, timedelta

from contracts.dto.common import Flow, Period
from contracts.dto.plan import ExpenseAlert, ExpenseAlerts, Severity
from contracts.dto.transactions import Transaction
from contracts.interfaces.controllers.errors import ValidationFailed
from services.plan.amounts import median_cents, spent_cents
from services.plan.history import PlanHistory

MIN_ALERT_DAYS = 7
MAX_ALERT_DAYS = 365
ALERT_MIN_RATIO = 3
ALERT_WARNING_RATIO = 6
ALERT_MIN_CENTS = 5000
ALERT_MIN_GROUP_ROWS = 5
MAX_ALERTS = 10
RATIO_DECIMALS = 1


def validate_alert_days(days: int) -> None:
    if not MIN_ALERT_DAYS <= days <= MAX_ALERT_DAYS:
        raise ValidationFailed(
            f"days must be {MIN_ALERT_DAYS}..{MAX_ALERT_DAYS}.",
            [{"field": "days", "issue": f"must be {MIN_ALERT_DAYS}..{MAX_ALERT_DAYS}"}],
        )


def build_alerts(history: PlanHistory, days: int) -> ExpenseAlerts:
    period = Period(from_date=history.today - timedelta(days=days - 1), to_date=history.today)
    alerts = []
    for row in history.rows:
        if not _is_spending_in(row, period.from_date):
            continue
        alert = _alert_for(row, history.rows)
        if alert is not None:
            alerts.append(alert)
    alerts.sort(key=lambda alert: alert.ratio, reverse=True)
    return ExpenseAlerts(period=period, alerts=alerts[:MAX_ALERTS])


def _is_spending_in(row: Transaction, from_date: date) -> bool:
    if row.flow != Flow.spending:
        return False
    return row.date >= from_date


def _alert_for(row: Transaction, history_rows: list[Transaction]) -> ExpenseAlert | None:
    group_amounts = [spent_cents(other) for other in history_rows if _is_same_group(other, row)]
    if len(group_amounts) < ALERT_MIN_GROUP_ROWS:
        return None
    typical = median_cents(group_amounts)
    amount = spent_cents(row)
    if typical <= 0 or not _is_unusual(amount, typical):
        return None
    ratio = round(amount / typical, RATIO_DECIMALS)
    return ExpenseAlert(
        transaction=row,
        reason=f"About {round(ratio)}x your usual {row.label} purchase",
        typical_amount_cents=typical,
        ratio=ratio,
        severity=_severity(ratio),
    )


def _is_same_group(other: Transaction, row: Transaction) -> bool:
    if other.flow != Flow.spending:
        return False
    return other.spend_group == row.spend_group


def _is_unusual(amount_cents: int, typical_cents: int) -> bool:
    if amount_cents < ALERT_MIN_CENTS:
        return False
    return amount_cents >= ALERT_MIN_RATIO * typical_cents


def _severity(ratio: float) -> Severity:
    if ratio >= ALERT_WARNING_RATIO:
        return Severity.warning
    return Severity.info
