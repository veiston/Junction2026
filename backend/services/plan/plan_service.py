"""PlanService: forecast, bills, safe-to-spend, expense alerts and what-if from the transaction history."""
from __future__ import annotations

from contracts.dto.plan import (
    BalanceForecast,
    CalculationStep,
    ExpenseAlerts,
    HorizonDays,
    SafeToSpend,
    Status,
    UpcomingBills,
    WhatIfRequest,
    WhatIfResult,
)
from contracts.interfaces.repositories.shared import Clock, MonthlySpendRepository, TransactionRepository
from services.plan.alerts import build_alerts, validate_alert_days
from services.plan.forecast import build_forecast
from services.plan.history import PlanHistory, history_source, load_history
from services.plan.periods import DAYS_IN_WEEK, days_ahead, full_month_keys
from services.plan.schedule import bills_between, next_payday
from services.plan.what_if import build_what_if, validate_request


class PlanServiceImpl:
    def __init__(
        self,
        transactions: TransactionRepository,
        monthly_spend: MonthlySpendRepository,
        clock: Clock,
    ) -> None:
        self._tx = transactions
        self._monthly_spend = monthly_spend
        self._clock = clock

    def forecast(self, customer_id: str, horizon_days: HorizonDays) -> BalanceForecast:
        history = self._history(customer_id)
        return build_forecast(history, self._balance(customer_id, history), horizon_days)

    def upcoming_bills(self, customer_id: str, horizon_days: HorizonDays) -> UpcomingBills:
        history = self._history(customer_id)
        bills = bills_between(history.bills, history.today, days_ahead(history.today, horizon_days))
        return UpcomingBills(
            horizon_days=horizon_days,
            bills=bills,
            total_cents=sum(bill.amount_cents for bill in bills),
        )

    def expense_alerts(self, customer_id: str, days: int) -> ExpenseAlerts:
        validate_alert_days(days)
        return build_alerts(self._history(customer_id), days)

    def safe_to_spend(self, customer_id: str) -> SafeToSpend:
        history = self._history(customer_id)
        return _build_safe_to_spend(history, self._balance(customer_id, history))

    def what_if(self, customer_id: str, request: WhatIfRequest) -> WhatIfResult:
        validate_request(request)
        history = self._history(customer_id)
        baseline = build_forecast(history, self._balance(customer_id, history), request.horizon_days)
        month_keys = full_month_keys(history.today)
        monthly_rows = self._monthly_spend.for_customer(customer_id, month_keys[0], month_keys[-1])
        return build_what_if(request, history, baseline, monthly_rows)

    def _history(self, customer_id: str) -> PlanHistory:
        return load_history(self._tx, customer_id, self._clock.today())

    def _balance(self, customer_id: str, history: PlanHistory) -> int:
        return self._tx.balance_on(customer_id, history.today)


def _build_safe_to_spend(history: PlanHistory, balance_cents: int) -> SafeToSpend:
    today = history.today
    payday = next_payday(history.salary, today)
    days = (payday - today).days
    bills_cents = sum(bill.amount_cents for bill in bills_between(history.bills, today, days_ahead(payday, -1)))
    essentials_cents = history.rates.essentials_cents * days
    buffer_cents = history.rates.irregular_cents * days
    safe_total = max(0, balance_cents - bills_cents - essentials_cents - buffer_cents)
    safe_per_day = safe_total // days
    return SafeToSpend(
        today=today,
        next_payday=payday,
        days_until_payday=days,
        balance_cents=balance_cents,
        upcoming_bills_cents=bills_cents,
        essentials_cents=essentials_cents,
        irregular_buffer_cents=buffer_cents,
        safe_total_cents=safe_total,
        safe_per_day_cents=safe_per_day,
        safe_this_week_cents=safe_per_day * min(DAYS_IN_WEEK, days),
        status=_status(safe_total, safe_per_day, history.rates.everyday_cents),
        steps=[
            CalculationStep(label="Balance today", amount_cents=balance_cents),
            CalculationStep(label="- Upcoming bills before payday", amount_cents=-bills_cents),
            CalculationStep(label="- Essentials until payday", amount_cents=-essentials_cents),
            CalculationStep(label="- Buffer for irregular costs", amount_cents=-buffer_cents),
            CalculationStep(label="= Safe to spend until payday", amount_cents=safe_total),
        ],
        source=history_source(history),
    )


def _status(safe_total: int, safe_per_day: int, everyday_daily: int) -> Status:
    if safe_total == 0:
        return Status.over
    if safe_per_day < everyday_daily:
        return Status.tight
    return Status.comfortable
