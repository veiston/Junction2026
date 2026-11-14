import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

from datetime import date, timedelta

import pytest

from contracts.dto.plan import (
    Confidence,
    HorizonDays,
    Severity,
    Status,
    WhatIfAdjustment,
    WhatIfRequest,
    WhatIfTargetType,
)
from contracts.interfaces.controllers.errors import ValidationFailed
from tests.plan._world import CUSTOMER_ID, RENT_CENTS, SALARY_CENTS, START_BALANCE, TODAY, make_service, standard_entries

HORIZONS = [HorizonDays.integer_30, HorizonDays.integer_60, HorizonDays.integer_90]
RENT_DUE = date(2026, 9, 20)
PAYDAY = date(2026, 9, 28)
GOAL_CENTS = 1000000


def adjustment(target_type: WhatIfTargetType, target: str, change_pct: int) -> WhatIfAdjustment:
    return WhatIfAdjustment(target_type=target_type, target=target, change_pct=change_pct)


def restaurants(change_pct: int) -> WhatIfAdjustment:
    return adjustment(WhatIfTargetType.category, "Restaurants", change_pct)


def request_of(*adjustments: WhatIfAdjustment, goal_cents: int | None = None) -> WhatIfRequest:
    return WhatIfRequest(adjustments=list(adjustments), horizon_days=HorizonDays.integer_90, goal_cents=goal_cents)


def balance_on(forecast, day: date) -> int:
    return next(point.balance_cents for point in forecast.points if point.date == day)


def daily_spend(forecast) -> int:
    return forecast.essentials_daily_cents + forecast.everyday_daily_cents + forecast.irregular_daily_cents


def without_group(group: str, month: int | None = None):
    return [
        entry
        for entry in standard_entries()
        if entry[1] != group or (month is not None and entry[0].month != month)
    ]


@pytest.mark.parametrize("horizon", HORIZONS)
def test_forecast_has_one_point_per_day_plus_start(horizon):
    assert len(make_service().forecast(CUSTOMER_ID, horizon).points) == horizon + 1


def test_forecast_starts_at_todays_balance():
    forecast = make_service().forecast(CUSTOMER_ID, HorizonDays.integer_30)
    assert (forecast.points[0].date, forecast.points[0].balance_cents) == (TODAY, forecast.start_balance_cents)


def test_forecast_lowest_and_end_match_points():
    forecast = make_service().forecast(CUSTOMER_ID, HorizonDays.integer_90)
    lowest = min(point.balance_cents for point in forecast.points)
    assert forecast.lowest_balance_cents == lowest
    assert balance_on(forecast, forecast.lowest_balance_date) == lowest
    assert forecast.end_balance_cents == forecast.points[-1].balance_cents


def test_forecast_subtracts_bill_on_due_date():
    forecast = make_service().forecast(CUSTOMER_ID, HorizonDays.integer_30)
    before = balance_on(forecast, RENT_DUE - timedelta(days=1))
    assert balance_on(forecast, RENT_DUE) == before - daily_spend(forecast) - RENT_CENTS


def test_forecast_adds_salary_on_payday():
    forecast = make_service().forecast(CUSTOMER_ID, HorizonDays.integer_30)
    before = balance_on(forecast, PAYDAY - timedelta(days=1))
    assert balance_on(forecast, PAYDAY) == before - daily_spend(forecast) + SALARY_CENTS


def test_upcoming_bills_are_sorted_and_totalled():
    result = make_service().upcoming_bills(CUSTOMER_ID, HorizonDays.integer_60)
    due_dates = [bill.due_date for bill in result.bills]
    assert due_dates == sorted(due_dates)
    assert result.total_cents == sum(bill.amount_cents for bill in result.bills)


def test_bill_confidence_is_high_for_three_of_three_months():
    bills = make_service().upcoming_bills(CUSTOMER_ID, HorizonDays.integer_30).bills
    rent = next(bill for bill in bills if bill.due_date == RENT_DUE)
    assert (rent.amount_cents, rent.confidence) == (RENT_CENTS, Confidence.high)


def test_bill_confidence_is_medium_for_two_of_three_months():
    service = make_service(without_group("utilities", month=7))
    bills = service.upcoming_bills(CUSTOMER_ID, HorizonDays.integer_30).bills
    utilities = next(bill for bill in bills if bill.label == "Utilities")
    assert utilities.confidence == Confidence.medium


def test_safe_to_spend_steps_add_up_to_the_total():
    safe = make_service().safe_to_spend(CUSTOMER_ID)
    amounts = [step.amount_cents for step in safe.steps]
    assert max(0, sum(amounts[:4])) == amounts[-1] == safe.safe_total_cents
    assert safe.upcoming_bills_cents == RENT_CENTS


def test_safe_this_week_is_per_day_times_days_capped_at_a_week():
    safe = make_service().safe_to_spend(CUSTOMER_ID)
    assert safe.days_until_payday == (PAYDAY - TODAY).days
    assert safe.safe_this_week_cents == safe.safe_per_day_cents * 7


def test_safe_to_spend_is_comfortable_with_a_healthy_balance():
    assert make_service().safe_to_spend(CUSTOMER_ID).status == Status.comfortable


def test_safe_to_spend_is_over_when_the_balance_is_gone():
    safe = make_service(start_balance=-START_BALANCE * 2).safe_to_spend(CUSTOMER_ID)
    assert (safe.safe_total_cents, safe.status) == (0, Status.over)


def test_safe_to_spend_is_tight_when_per_day_is_below_everyday_rate():
    base = make_service().safe_to_spend(CUSTOMER_ID)
    forecast = make_service().forecast(CUSTOMER_ID, HorizonDays.integer_30)
    target_total = forecast.everyday_daily_cents * base.days_until_payday // 2
    shifted_balance = START_BALANCE + target_total - base.safe_total_cents
    assert make_service(start_balance=shifted_balance).safe_to_spend(CUSTOMER_ID).status == Status.tight


def test_without_recent_salary_payday_is_thirty_days_out_and_no_income_expected():
    service = make_service(without_group("salary"))
    safe = service.safe_to_spend(CUSTOMER_ID)
    assert safe.next_payday == TODAY + timedelta(days=30)
    assert service.forecast(CUSTOMER_ID, HorizonDays.integer_30).expected_income == []


def test_outlier_is_flagged_as_warning():
    alerts = make_service().expense_alerts(CUSTOMER_ID, 7).alerts
    assert (alerts[0].transaction.amount_cents, alerts[0].severity) == (-60000, Severity.warning)
    assert alerts[0].reason == "About 20x your usual Restaurants purchase"


def test_alerts_skip_small_rows_and_sort_by_ratio():
    alerts = make_service().expense_alerts(CUSTOMER_ID, 30).alerts
    assert [alert.transaction.amount_cents for alert in alerts] == [-60000, -12000]
    assert alerts[1].severity == Severity.info


@pytest.mark.parametrize("days", [6, 366])
def test_alert_days_out_of_range_is_rejected(days):
    with pytest.raises(ValidationFailed):
        make_service().expense_alerts(CUSTOMER_ID, days)


def test_what_if_with_zero_percent_equals_baseline():
    service = make_service()
    result = service.what_if(CUSTOMER_ID, request_of(restaurants(0)))
    assert result.adjusted_points == result.baseline_points
    assert result.adjusted_end_balance_cents == result.baseline_end_balance_cents
    assert result.monthly_saving_cents == 0


def test_what_if_cutting_restaurants_by_twenty_percent_saves_a_fifth():
    result = make_service().what_if(CUSTOMER_ID, request_of(restaurants(-20)))
    line = result.lines[0]
    assert line.label == "Restaurants"
    assert result.monthly_saving_cents == line.baseline_monthly_cents // 5
    assert result.yearly_saving_cents == result.monthly_saving_cents * 12
    assert result.adjusted_end_balance_cents > result.baseline_end_balance_cents


def test_what_if_rejects_unknown_target():
    with pytest.raises(ValidationFailed):
        make_service().what_if(CUSTOMER_ID, request_of(adjustment(WhatIfTargetType.category, "Nonsense", -10)))


def test_what_if_rejects_duplicate_target():
    with pytest.raises(ValidationFailed):
        make_service().what_if(CUSTOMER_ID, request_of(restaurants(-10), restaurants(-20)))


def test_what_if_goal_months_shrink_with_savings():
    goal = make_service().what_if(CUSTOMER_ID, request_of(restaurants(-50), goal_cents=GOAL_CENTS)).goal
    assert goal.months_to_goal_baseline is not None
    assert goal.months_to_goal_adjusted < goal.months_to_goal_baseline


def test_what_if_goal_is_never_reached_without_surplus():
    service = make_service(without_group("salary"))
    goal = service.what_if(CUSTOMER_ID, request_of(restaurants(0), goal_cents=GOAL_CENTS)).goal
    assert goal.months_to_goal_baseline is None


def test_customer_without_history_gets_a_flat_forecast():
    service = make_service([], start_balance=0)
    forecast = service.forecast(CUSTOMER_ID, HorizonDays.integer_30)
    assert {point.balance_cents for point in forecast.points} == {0}
    assert forecast.upcoming_bills == []
    assert service.safe_to_spend(CUSTOMER_ID).safe_total_cents == 0
    assert service.expense_alerts(CUSTOMER_ID, 30).alerts == []
