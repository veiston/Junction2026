"""What-if: spend less (or more) in chosen areas and compare the balance lines."""
from __future__ import annotations

from contracts.dto.common import Basket, Category, Flow, SpendGroup, TrendPoint
from contracts.dto.plan import (
    BalanceForecast,
    Goal,
    WhatIfAdjustment,
    WhatIfLine,
    WhatIfRequest,
    WhatIfResult,
    WhatIfTargetType,
)
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.repositories.shared import MonthlySpendRow
from services.plan.history import PlanHistory, history_source
from services.plan.periods import DAYS_IN_YEAR, FULL_MONTHS, MONTHS_IN_YEAR

PERCENT = 100
GOAL_DECIMALS = 1
TARGET_ENUMS = {
    WhatIfTargetType.basket: Basket,
    WhatIfTargetType.category: Category,
    WhatIfTargetType.spend_group: SpendGroup,
}
ROW_FIELDS = {
    WhatIfTargetType.basket: "basket",
    WhatIfTargetType.category: "category",
    WhatIfTargetType.spend_group: "spend_group",
}
BASKET_LABELS = {
    Basket.mandatory_regular.value: "Essentials",
    Basket.mandatory_irregular.value: "Irregular costs",
    Basket.everyday.value: "Everyday spending",
}


def validate_request(request: WhatIfRequest) -> None:
    seen = set()
    for index, adjustment in enumerate(request.adjustments):
        field = f"adjustments[{index}].target"
        if not _is_known_target(adjustment):
            raise ValidationFailed("Unknown what-if target.", [{"field": field, "issue": "unknown target"}])
        key = (adjustment.target_type, adjustment.target)
        if key in seen:
            raise ValidationFailed("Duplicate what-if target.", [{"field": field, "issue": "duplicate target"}])
        seen.add(key)


def _is_known_target(adjustment: WhatIfAdjustment) -> bool:
    allowed = {member.value for member in TARGET_ENUMS[adjustment.target_type]}
    return adjustment.target in allowed


def build_what_if(
    request: WhatIfRequest,
    history: PlanHistory,
    baseline: BalanceForecast,
    monthly_rows: list[MonthlySpendRow],
) -> WhatIfResult:
    lines = [_line(adjustment, monthly_rows) for adjustment in request.adjustments]
    monthly_saving = sum(line.baseline_monthly_cents - line.adjusted_monthly_cents for line in lines)
    adjusted_points = _adjusted_points(baseline.points, monthly_saving)
    return WhatIfResult(
        request=request,
        lines=lines,
        monthly_saving_cents=monthly_saving,
        yearly_saving_cents=monthly_saving * MONTHS_IN_YEAR,
        baseline_end_balance_cents=baseline.points[-1].balance_cents,
        adjusted_end_balance_cents=adjusted_points[-1].balance_cents,
        baseline_points=baseline.points,
        adjusted_points=adjusted_points,
        goal=_goal(request.goal_cents, monthly_rows, monthly_saving),
        source=history_source(history),
    )


def _line(adjustment: WhatIfAdjustment, monthly_rows: list[MonthlySpendRow]) -> WhatIfLine:
    field = ROW_FIELDS[adjustment.target_type]
    total = sum(-row.amount_cents for row in monthly_rows if _is_target_spending(row, field, adjustment.target))
    baseline = round(total / FULL_MONTHS)
    return WhatIfLine(
        target_type=adjustment.target_type,
        target=adjustment.target,
        label=_label(adjustment),
        baseline_monthly_cents=baseline,
        adjusted_monthly_cents=round(baseline * (PERCENT + adjustment.change_pct) / PERCENT),
    )


def _is_target_spending(row: MonthlySpendRow, field: str, target: str) -> bool:
    if _text(row.flow) != Flow.spending.value:
        return False
    return _text(getattr(row, field)) == target


def _text(value) -> str:
    """Repositories return plain strings, the fakes return enums."""
    return getattr(value, "value", value)


def _label(adjustment: WhatIfAdjustment) -> str:
    if adjustment.target_type == WhatIfTargetType.basket:
        return BASKET_LABELS[adjustment.target]
    if adjustment.target_type == WhatIfTargetType.spend_group:
        return adjustment.target.replace("_", " ").capitalize()
    return adjustment.target


def _adjusted_points(points: list[TrendPoint], monthly_saving: int) -> list[TrendPoint]:
    yearly_saving = monthly_saving * MONTHS_IN_YEAR
    return [
        TrendPoint(date=point.date, balance_cents=point.balance_cents + round(yearly_saving * offset / DAYS_IN_YEAR))
        for offset, point in enumerate(points)
    ]


def _goal(goal_cents: int | None, monthly_rows: list[MonthlySpendRow], monthly_saving: int) -> Goal | None:
    if goal_cents is None:
        return None
    surplus = _monthly_surplus(monthly_rows)
    return Goal(
        goal_cents=goal_cents,
        months_to_goal_baseline=_months_to(goal_cents, surplus),
        months_to_goal_adjusted=_months_to(goal_cents, surplus + monthly_saving),
    )


def _monthly_surplus(monthly_rows: list[MonthlySpendRow]) -> int:
    income = sum(row.amount_cents for row in monthly_rows if _text(row.flow) == Flow.income.value)
    spending = sum(-row.amount_cents for row in monthly_rows if _text(row.flow) == Flow.spending.value)
    return round((income - spending) / FULL_MONTHS)


def _months_to(goal_cents: int, monthly_cents: int) -> float | None:
    if monthly_cents <= 0:
        return None
    return round(goal_cents / monthly_cents, GOAL_DECIMALS)
