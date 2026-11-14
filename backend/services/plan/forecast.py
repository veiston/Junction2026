"""Day-by-day balance projection."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from contracts.dto.common import TrendPoint
from contracts.dto.plan import BalanceForecast, Bill, HorizonDays, IncomeEvent
from services.plan.history import PlanHistory, history_source
from services.plan.periods import days_ahead
from services.plan.schedule import bills_between, income_events

METHOD = (
    "Starts from today's balance, subtracts your usual daily spending and known bills, "
    "and adds your expected salary."
)


def build_forecast(history: PlanHistory, balance_cents: int, horizon: HorizonDays) -> BalanceForecast:
    today = history.today
    end = days_ahead(today, horizon)
    bills = bills_between(history.bills, today, end)
    income = income_events(history.salary, today, end)
    points = _project(today, balance_cents, int(horizon), history.rates.total_cents, bills, income)
    lowest = min(points, key=lambda point: point.balance_cents)
    return BalanceForecast(
        horizon_days=horizon,
        start_date=today,
        start_balance_cents=balance_cents,
        end_balance_cents=points[-1].balance_cents,
        lowest_balance_cents=lowest.balance_cents,
        lowest_balance_date=lowest.date,
        points=points,
        upcoming_bills=bills,
        expected_income=income,
        essentials_daily_cents=history.rates.essentials_cents,
        everyday_daily_cents=history.rates.everyday_cents,
        irregular_daily_cents=history.rates.irregular_cents,
        method=METHOD,
        source=history_source(history),
    )


def _project(
    today: date,
    balance_cents: int,
    horizon: int,
    daily_spend_cents: int,
    bills: list[Bill],
    income: list[IncomeEvent],
) -> list[TrendPoint]:
    net_by_date: dict[date, int] = defaultdict(int)
    for bill in bills:
        net_by_date[bill.due_date] -= bill.amount_cents
    for event in income:
        net_by_date[event.date] += event.amount_cents
    points = [TrendPoint(date=today, balance_cents=balance_cents)]
    for offset in range(1, horizon + 1):
        day = today + timedelta(days=offset)
        balance_cents += net_by_date[day] - daily_spend_cents
        points.append(TrendPoint(date=day, balance_cents=balance_cents))
    return points
