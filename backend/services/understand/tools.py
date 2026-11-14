"""AI tools of the understand slice. The slice fills TOOLS; foundation only imports it.

Each tool validates its arguments, calls UnderstandService (the same methods as the REST
controller), and returns small FACTS for the LLM plus one widget for the UI. The LLM never
sees raw rows and never computes a number.
"""
from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import date
from typing import Any

from contracts.dto.common import Basket, Category, SpendGroup
from contracts.dto.widgets import Widget
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import AiTool, ToolContext, ToolResult
from services.understand.service import NON_SPENDING_CATEGORIES

ServiceFor = Callable[[date], Any]

BASKETS = [b.value for b in Basket]
SPENDING_CATEGORIES = [c.value for c in Category if c.value not in NON_SPENDING_CATEGORIES]
SPENDING_GROUPS = [
    g.value for g in SpendGroup
    if g.value not in {"salary", "other_income", "investment_deposit", "investment_withdrawal", "salary_sweep"}
]
MONTH = {"type": "string", "description": "YYYY-MM. Default: the month of today."}

# Sent with the facts so the reply stays short and never repeats the card the customer sees.
REPLY_HINTS: dict[str, str] = {
    "get_basket_breakdown": "The card shows all baskets and amounts. In 1-2 sentences, name the one basket "
                            "that stands out (biggest change or everyday share) and why it matters.",
    "get_basket_trend": "The chart shows every month. In 1-2 sentences, say the single clearest direction "
                        "(growing, shrinking or steady) of the everyday basket.",
    "get_spending": "The card shows the amount, count and purchases. In 1 sentence, give the total in euros "
                    "and whether it is more or less than the previous period.",
    "get_spender_profile": "The card shows the persona, traits and tips. In 1-2 sentences, explain the persona "
                           "kindly in everyday words. Never judge.",
    "compare_with_peers": "The card shows the comparison. In 1-2 sentences, say plainly whether the customer is "
                          "below, near or above the typical similar customer.",
}


def _default_service_for(today: date) -> Any:
    from services.understand.wiring import tool_service  # lazy: needs config only when used

    return tool_service(today)


def _check_unknown(args: dict[str, Any], parameters: dict[str, Any]) -> None:
    unknown = set(args) - set(parameters["properties"])
    if unknown:
        raise ValidationFailed(f"Unknown arguments: {sorted(unknown)}.")


def _date(args: dict[str, Any], key: str) -> date | None:
    v = args.get(key)
    if v is None:
        return None
    try:
        return date.fromisoformat(v)
    except (TypeError, ValueError):
        raise ValidationFailed(f"{key} must be YYYY-MM-DD.", [{"field": key, "issue": "bad date"}]) from None


def _choice(args: dict[str, Any], key: str, allowed: list[str]) -> str | None:
    v = args.get(key)
    if v is None:
        return None
    if v not in allowed:
        raise ValidationFailed(f"{key} must be one of {allowed}.", [{"field": key, "issue": "unknown value"}])
    return v


def _widget(kind: str, dto) -> Widget:
    return Widget(id=f"w_{uuid.uuid4().hex[:6]}", type=kind, version=1, data=dto.model_dump(mode="json"))


class _Tool:
    name: str
    description: str
    parameters: dict[str, Any]

    def __init__(self, service_for: ServiceFor = _default_service_for) -> None:
        self._service_for = service_for

    def _svc(self, ctx: ToolContext) -> Any:
        return self._service_for(ctx.today)


class GetBasketBreakdownTool(_Tool):
    name = "get_basket_breakdown"
    description = (
        "Split the customer's spending of one month into S-Bank's three baskets: mandatory & regular, "
        "mandatory & irregular, and everyday. Use for 'where does my money go', 'understand my money', "
        "'my spending this month'."
    )
    parameters = {"type": "object", "properties": {"month": MONTH}, "additionalProperties": False}

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_unknown(arguments, self.parameters)
        b = self._svc(ctx).basket_breakdown(ctx.customer_id, arguments.get("month"))
        facts = {
            "month": b.month,
            "month_in_progress": b.is_partial_month,
            "total_spending_cents": b.total_spending_cents,
            "income_cents": b.income_cents,
            "saving_cents": b.saving_cents,
            "baskets": [
                {
                    "basket": d.basket.value, "amount_cents": d.amount_cents, "share_pct": d.share_pct,
                    "change_vs_previous_month_pct": d.change_pct,
                    "top_group": d.top_groups[0].label if d.top_groups else None,
                }
                for d in b.baskets
            ],
        }
        return ToolResult(facts={**facts, "reply_hint": REPLY_HINTS[self.name]}, widgets=[_widget("basket_breakdown", b)], sources=[b.source])


class GetBasketTrendTool(_Tool):
    name = "get_basket_trend"
    description = (
        "Show how the three baskets changed month by month (1-12 months, default 6). "
        "Use for 'how has my spending changed', 'trend', 'lifestyle creep'."
    )
    parameters = {
        "type": "object",
        "properties": {"months": {"type": "integer", "minimum": 1, "maximum": 12, "description": "Default 6."}},
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_unknown(arguments, self.parameters)
        months = arguments.get("months", 6)
        if isinstance(months, float) and months.is_integer():
            months = int(months)  # some models send 6.0
        t = self._svc(ctx).basket_trend(ctx.customer_id, months)
        facts = {
            "months": [
                {"month": m.month, **{b.basket.value + "_cents": b.amount_cents for b in m.baskets}}
                for m in t.months
            ],
            "last_month_in_progress": t.months[-1].month == ctx.today.strftime("%Y-%m"),
        }
        return ToolResult(facts={**facts, "reply_hint": REPLY_HINTS[self.name]}, widgets=[_widget("basket_trend", t)], sources=[t.source])


class GetSpendingTool(_Tool):
    name = "get_spending"
    description = (
        "Exact amount spent on ONE basket, category or spend group in a period, with the largest "
        "transactions. Use for 'how much did I spend on taxis last month', 'restaurants this year'. "
        "Give exactly one of basket, category or spend_group."
    )
    parameters = {
        "type": "object",
        "properties": {
            "basket": {"type": "string", "enum": BASKETS},
            "category": {"type": "string", "enum": SPENDING_CATEGORIES},
            "spend_group": {"type": "string", "enum": SPENDING_GROUPS,
                            "description": "Most precise, e.g. taxis, fast_food_cafes, supermarkets."},
            "from_date": {"type": "string", "description": "YYYY-MM-DD. Default: first day of to_date's month."},
            "to_date": {"type": "string", "description": "YYYY-MM-DD. Default: today."},
        },
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_unknown(arguments, self.parameters)
        to_date = _date(arguments, "to_date") or ctx.today
        from_date = _date(arguments, "from_date") or to_date.replace(day=1)
        s = self._svc(ctx).spending(
            ctx.customer_id, from_date, to_date,
            basket=_choice(arguments, "basket", BASKETS),
            category=_choice(arguments, "category", SPENDING_CATEGORIES),
            spend_group=_choice(arguments, "spend_group", SPENDING_GROUPS),
        )
        facts: dict[str, Any] = {
            "label": s.label,
            "period": f"{s.query.from_date}..{s.query.to_date}",
            "amount_cents": s.amount_cents,
            "tx_count": s.tx_count,
            "average_tx_cents": s.average_tx_cents,
            "previous_period_amount_cents": s.previous_period_amount_cents,
        }
        if s.sample_transactions:
            top = s.sample_transactions[0]
            facts["largest"] = {"date": str(top.date), "label": top.label, "amount_cents": -top.amount_cents}
        return ToolResult(facts={**facts, "reply_hint": REPLY_HINTS[self.name]}, widgets=[_widget("spending_summary", s)], sources=[s.source])


class GetSpenderProfileTool(_Tool):
    name = "get_spender_profile"
    description = (
        "A friendly, non-judgmental spender persona from the timing and size of everyday purchases "
        "(last 90 days). Use for 'what kind of spender am I', 'my spending habits'."
    )
    parameters = {"type": "object", "properties": {}, "additionalProperties": False}

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_unknown(arguments, self.parameters)
        p = self._svc(ctx).spender_profile(ctx.customer_id)
        facts = {
            "persona": p.persona.value,
            "title": p.title,
            "metrics": p.metrics.model_dump(mode="json"),
            "tips": p.tips,
        }
        return ToolResult(facts={**facts, "reply_hint": REPLY_HINTS[self.name]}, widgets=[_widget("spender_profile", p)], sources=[p.source])


class CompareWithPeersTool(_Tool):
    name = "compare_with_peers"
    description = (
        "Compare the customer's monthly spending on a basket or category with similar customers "
        "(same age band and region), plus an official Statistics Finland share when available. "
        "Use for 'how do I compare', 'is my grocery spending normal'."
    )
    parameters = {
        "type": "object",
        "properties": {
            "scope": {"type": "string", "enum": ["basket", "category"]},
            "key": {"type": "string", "enum": BASKETS + SPENDING_CATEGORIES,
                    "description": "A basket when scope=basket, a category when scope=category."},
        },
        "required": ["scope", "key"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_unknown(arguments, self.parameters)
        scope, key = arguments.get("scope"), arguments.get("key")
        if scope is None and key is not None:  # be forgiving: infer the scope from the key
            scope = "basket" if key in BASKETS else "category"
        if scope is None or key is None:
            raise ValidationFailed("scope and key are required.", [{"field": "key", "issue": "required"}])
        b = self._svc(ctx).peer_benchmark(ctx.customer_id, scope, key)
        facts: dict[str, Any] = {
            "label": b.label,
            "your_monthly_cents": b.your_monthly_cents,
            "your_share_of_spending_pct": b.your_share_of_spending_pct,
            "peer_median_monthly_cents": b.peer_median_monthly_cents,
            "your_percentile": b.your_percentile,
            "peer_group": f"{b.peer_group.age_band.value}, {b.peer_group.region}, {b.peer_group.size} customers",
        }
        if b.open_data is not None:
            facts["statistics_finland"] = {
                "label": b.open_data.label, "share_pct": b.open_data.share_of_spending_pct, "year": b.open_data.year,
            }
        return ToolResult(facts={**facts, "reply_hint": REPLY_HINTS[self.name]}, widgets=[_widget("peer_benchmark", b)], sources=[b.source])


def build_tools(service_for: ServiceFor = _default_service_for) -> list[AiTool]:
    return [
        GetBasketBreakdownTool(service_for),
        GetBasketTrendTool(service_for),
        GetSpendingTool(service_for),
        GetSpenderProfileTool(service_for),
        CompareWithPeersTool(service_for),
    ]


TOOLS: list[AiTool] = build_tools()
