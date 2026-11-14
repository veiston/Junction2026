"""AI tools of the plan slice: same service calls as the /plan REST endpoints."""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, ValidationError

from contracts.dto.common import Period, Source
from contracts.dto.plan import (
    HorizonDays,
    WhatIfAdjustment,
    WhatIfRequest,
    WhatIfTargetType,
)
from contracts.dto.widgets import Widget
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import AiTool, ToolContext, ToolResult
from services.plan.alerts import MAX_ALERT_DAYS, MIN_ALERT_DAYS

DEFAULT_HORIZON_DAYS = HorizonDays.integer_30
DEFAULT_ALERT_DAYS = 90
MIN_CHANGE_PCT = -100
MAX_CHANGE_PCT = 100
# The contract has no item count, so tx_count holds the number of bills / alerts shown.
BILLS_SOURCE_DESCRIPTION = "Predicted from your recurring payments"
ALERTS_SOURCE_DESCRIPTION = "Compared with your own spending history"

HORIZON_PROPERTY = {
    "type": "integer",
    "enum": [horizon.value for horizon in HorizonDays],
    "description": "Days to look ahead. Default 30.",
}
HORIZON_PARAMETERS = {
    "type": "object",
    "properties": {"horizon_days": HORIZON_PROPERTY},
    "additionalProperties": False,
}


def _reject_unknown_arguments(parameters: dict[str, Any], arguments: dict[str, Any]) -> None:
    unknown = set(arguments) - set(parameters["properties"])
    if unknown:
        raise ValidationFailed(f"Unknown arguments: {sorted(unknown)}.")


def _integer_argument(arguments: dict[str, Any], key: str, default: int) -> int:
    value = arguments.get(key, default)
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValidationFailed(f"{key} must be an integer.", [{"field": key, "issue": "not an integer"}])
    return value


def _horizon_argument(arguments: dict[str, Any]) -> HorizonDays:
    value = _integer_argument(arguments, "horizon_days", DEFAULT_HORIZON_DAYS.value)
    try:
        return HorizonDays(value)
    except ValueError:
        raise ValidationFailed("horizon_days must be 30, 60 or 90.", [{"field": "horizon_days", "issue": "unsupported"}]) from None


def _widget(widget_type: str, dto: BaseModel) -> Widget:
    return Widget(id=f"w_{uuid.uuid4().hex[:6]}", type=widget_type, version=1, data=dto.model_dump(mode="json"))


class _PlanTool:
    """Template: check arguments, call the service, wrap the DTO as widget, facts and source."""

    widget_type: str

    def __init__(self, plan) -> None:
        self._plan = plan

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _reject_unknown_arguments(self.parameters, arguments)
        dto = self._fetch(ctx, arguments)
        return ToolResult(facts=self._facts(dto), widgets=[_widget(self.widget_type, dto)], sources=[self._source(ctx, dto)])

    def _source(self, ctx: ToolContext, dto) -> Source:
        return dto.source


class GetBalanceForecastTool(_PlanTool):
    name = "get_balance_forecast"
    description = (
        "Forecast the customer's daily account balance for the next 30, 60 or 90 days. "
        "Use for 'will I run out of money', 'what will my balance be', 'plan my finances'."
    )
    parameters = HORIZON_PARAMETERS
    widget_type = "balance_forecast"

    def _fetch(self, ctx: ToolContext, arguments: dict[str, Any]):
        return self._plan.forecast(ctx.customer_id, _horizon_argument(arguments))

    def _facts(self, dto) -> dict[str, Any]:
        return {
            "horizon_days": dto.horizon_days.value,
            "start_balance_cents": dto.start_balance_cents,
            "end_balance_cents": dto.end_balance_cents,
            "lowest_balance_cents": dto.lowest_balance_cents,
            "lowest_balance_date": dto.lowest_balance_date.isoformat(),
            "upcoming_bills_count": len(dto.upcoming_bills),
            "upcoming_bills_cents": sum(bill.amount_cents for bill in dto.upcoming_bills),
            "method": dto.method,
        }


class GetUpcomingBillsTool(_PlanTool):
    name = "get_upcoming_bills"
    description = (
        "List the bills the customer is expected to pay in the next 30, 60 or 90 days. "
        "Use for 'what bills are coming up', 'when is my rent due'."
    )
    parameters = HORIZON_PARAMETERS
    widget_type = "upcoming_bills"

    def _fetch(self, ctx: ToolContext, arguments: dict[str, Any]):
        return self._plan.upcoming_bills(ctx.customer_id, _horizon_argument(arguments))

    def _facts(self, dto) -> dict[str, Any]:
        facts: dict[str, Any] = {
            "horizon_days": dto.horizon_days.value,
            "bills_count": len(dto.bills),
            "total_cents": dto.total_cents,
        }
        if dto.bills:
            facts["next_bill"] = {
                "label": dto.bills[0].label,
                "due_date": dto.bills[0].due_date.isoformat(),
                "amount_cents": dto.bills[0].amount_cents,
            }
        return facts

    def _source(self, ctx: ToolContext, dto) -> Source:
        period = Period(from_date=ctx.today, to_date=ctx.today + timedelta(days=dto.horizon_days.value))
        return Source(description=BILLS_SOURCE_DESCRIPTION, period=period, tx_count=len(dto.bills))


class GetExpenseAlertsTool(_PlanTool):
    name = "get_expense_alerts"
    description = (
        "Find purchases that were unusually large compared with the customer's own history. "
        "Use for 'any strange expenses', 'did I overspend on something'."
    )
    parameters = {
        "type": "object",
        "properties": {
            "days": {
                "type": "integer",
                "minimum": MIN_ALERT_DAYS,
                "maximum": MAX_ALERT_DAYS,
                "description": f"Days to look back. Default {DEFAULT_ALERT_DAYS}.",
            },
        },
        "additionalProperties": False,
    }
    widget_type = "expense_alerts"

    def _fetch(self, ctx: ToolContext, arguments: dict[str, Any]):
        return self._plan.expense_alerts(ctx.customer_id, _integer_argument(arguments, "days", DEFAULT_ALERT_DAYS))

    def _facts(self, dto) -> dict[str, Any]:
        facts: dict[str, Any] = {
            "period": f"{dto.period.from_date}..{dto.period.to_date}",
            "alerts_count": len(dto.alerts),
        }
        if dto.alerts:
            facts["top_alert"] = {"reason": dto.alerts[0].reason, "amount_cents": dto.alerts[0].transaction.amount_cents}
        return facts

    def _source(self, ctx: ToolContext, dto) -> Source:
        return Source(description=ALERTS_SOURCE_DESCRIPTION, period=dto.period, tx_count=len(dto.alerts))


class GetSafeToSpendTool(_PlanTool):
    name = "get_safe_to_spend"
    description = (
        "Show how much the customer can safely spend until the next payday. "
        "Use for 'what is safe to spend this week', 'how much can I spend today'."
    )
    parameters = {"type": "object", "properties": {}, "additionalProperties": False}
    widget_type = "safe_to_spend"

    def _fetch(self, ctx: ToolContext, arguments: dict[str, Any]):
        return self._plan.safe_to_spend(ctx.customer_id)

    def _facts(self, dto) -> dict[str, Any]:
        return {
            "safe_per_day_cents": dto.safe_per_day_cents,
            "safe_this_week_cents": dto.safe_this_week_cents,
            "safe_total_cents": dto.safe_total_cents,
            "next_payday": dto.next_payday.isoformat(),
            "days_until_payday": dto.days_until_payday,
            "status": dto.status.value,
        }


class SimulateWhatIfTool(_PlanTool):
    name = "simulate_what_if"
    description = (
        "Simulate spending less (negative change_pct) or more (positive) in one basket, category or spend group. "
        "Use for 'how much would I save if I cut dining by 20 %'. Give exactly one of basket, category, spend_group."
    )
    parameters = {
        "type": "object",
        "properties": {
            "basket": {"type": "string", "enum": ["mandatory_regular", "mandatory_irregular", "everyday"]},
            "category": {"type": "string", "description": "A spending category, e.g. Restaurants."},
            "spend_group": {"type": "string", "description": "A spend group, e.g. restaurants."},
            "change_pct": {
                "type": "integer",
                "minimum": MIN_CHANGE_PCT,
                "maximum": MAX_CHANGE_PCT,
                "description": "-20 = spend 20 % less.",
            },
            "horizon_days": HORIZON_PROPERTY,
            "goal_cents": {"type": "integer", "minimum": 0, "description": "Optional savings goal in euro cents."},
        },
        "required": ["change_pct"],
        "additionalProperties": False,
    }
    widget_type = "what_if"

    def _fetch(self, ctx: ToolContext, arguments: dict[str, Any]):
        return self._plan.what_if(ctx.customer_id, _what_if_request(arguments))

    def _facts(self, dto) -> dict[str, Any]:
        facts: dict[str, Any] = {
            "monthly_saving_cents": dto.monthly_saving_cents,
            "yearly_saving_cents": dto.yearly_saving_cents,
            "baseline_end_balance_cents": dto.baseline_end_balance_cents,
            "adjusted_end_balance_cents": dto.adjusted_end_balance_cents,
        }
        if dto.goal is not None:
            facts["goal_cents"] = dto.goal.goal_cents
            facts["months_to_goal_baseline"] = dto.goal.months_to_goal_baseline
            facts["months_to_goal_adjusted"] = dto.goal.months_to_goal_adjusted
        return facts


def _what_if_request(arguments: dict[str, Any]) -> WhatIfRequest:
    target_type = _single_target_type(arguments)
    try:
        return WhatIfRequest(
            adjustments=[
                WhatIfAdjustment(
                    target_type=target_type,
                    target=arguments[target_type.value],
                    change_pct=arguments.get("change_pct"),
                )
            ],
            horizon_days=_horizon_argument(arguments),
            goal_cents=arguments.get("goal_cents"),
        )
    except ValidationError as error:
        issues = [{"field": ".".join(map(str, item["loc"])), "issue": item["msg"]} for item in error.errors()]
        raise ValidationFailed("Invalid what-if request.", issues) from None


def _single_target_type(arguments: dict[str, Any]) -> WhatIfTargetType:
    given = [target_type for target_type in WhatIfTargetType if target_type.value in arguments]
    if len(given) != 1:
        raise ValidationFailed("Give exactly one of basket, category or spend_group.")
    return given[0]


def build_plan_tools(plan) -> list[AiTool]:
    return [
        GetBalanceForecastTool(plan),
        GetUpcomingBillsTool(plan),
        GetExpenseAlertsTool(plan),
        GetSafeToSpendTool(plan),
        SimulateWhatIfTool(plan),
    ]
