"""Chat tools of the habits slice. The slice fills TOOLS; foundation only imports it."""
from __future__ import annotations

import re
import uuid
from typing import Any

from contracts.dto.common import Source
from contracts.dto.widgets import Widget
from contracts.interfaces.controllers.errors import NotFound, ValidationFailed
from contracts.interfaces.llm.ai_tool import AiTool, ToolContext, ToolResult

MAX_PROGRESS_WIDGETS = 2
_MONTH = re.compile(r"^[0-9]{4}-(0[1-9]|1[0-2])$")
_NO_ARGS = {"type": "object", "properties": {}, "additionalProperties": False}


def _widget(kind: str, data) -> Widget:
    return Widget(id=f"w_{uuid.uuid4().hex[:6]}", type=kind, version=1, data=data.model_dump(mode="json"))


def _check_args(arguments: dict[str, Any], allowed: set[str]) -> None:
    unknown = set(arguments) - allowed
    if unknown:
        raise ValidationFailed(f"Unknown arguments: {sorted(unknown)}.")


class _HabitsTool:
    name: str
    description: str
    parameters: dict[str, Any] = _NO_ARGS

    def __init__(self) -> None:
        self.service = None

    def _svc(self):
        if self.service is None:
            raise RuntimeError("Habits service is not connected.")
        return self.service


class SuggestMonthlyLimitTool(_HabitsTool):
    name = "suggest_monthly_limit"
    description = (
        "Suggest a monthly limit for the customer's everyday spending, based on their last full months. "
        "Use for 'help me improve my habits', 'set a spending limit', 'how much should I spend on everyday things'."
    )

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_args(arguments, set())
        s = self._svc().limit_suggestion(ctx.customer_id)
        facts = {
            "month": s.month, "suggested_cents": s.suggested_cents, "min_cents": s.min_cents,
            "max_cents": s.max_cents, "expected_saving_cents": s.expected_saving_cents,
            "history": [{"month": h.month, "amount_cents": h.amount_cents} for h in s.history],
            "note": "The customer can adjust the amount on the card and accept it with the button.",
        }
        return ToolResult(facts=facts, widgets=[_widget("limit_suggestion", s)], sources=[s.source])


class GetLimitProgressTool(_HabitsTool):
    name = "get_limit_progress"
    description = (
        "Show how the customer is doing against this month's everyday spending limit. "
        "Use for 'how am I doing against my limit', 'am I on track this month'."
    )

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_args(arguments, set())
        try:
            p = self._svc().current_limit_progress(ctx.customer_id)
        except NotFound:
            return ToolResult(facts={"has_limit": False,
                                     "note": "No limit is set for this month. Offer to suggest one."})
        facts = {
            "has_limit": True, "limit_cents": p.limit.amount_cents, "spent_cents": p.spent_cents,
            "remaining_cents": p.remaining_cents, "on_pace_cents": p.on_pace_cents, "status": p.status.value,
            "days_elapsed": p.days_elapsed, "days_in_month": p.days_in_month,
            "top_groups": [{"label": g.label, "amount_cents": g.amount_cents} for g in p.top_groups],
        }
        return ToolResult(facts=facts, widgets=[_widget("limit_progress", p)], sources=[p.source])


class ReviewLimitTool(_HabitsTool):
    name = "review_limit"
    description = (
        "Review the result of the customer's monthly limit: met or not, difference, biggest leak, best week. "
        "Works mid-month as 'so far'. Use for 'how did I do last month', 'review my limit'."
    )
    parameters = {
        "type": "object",
        "properties": {"month": {"type": "string", "description": "YYYY-MM. Default: this month, else last month."}},
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_args(arguments, {"month"})
        month = arguments.get("month")
        if month is not None and not (isinstance(month, str) and _MONTH.match(month)):
            raise ValidationFailed("month must be YYYY-MM.", [{"field": "month", "issue": "bad month"}])
        svc = self._svc()
        limit_id = svc.limit_id_for_month(ctx.customer_id, month)
        if limit_id is None:
            return ToolResult(facts={"has_limit": False, "note": "No limit found for that month."})
        r = svc.limit_review(ctx.customer_id, limit_id)
        facts = {
            "has_limit": True, "month": r.limit.month, "limit_cents": r.limit.amount_cents,
            "final_spent_cents": r.final_spent_cents, "difference_cents": r.difference_cents, "met": r.met,
            "previous_month_cents": r.previous_month_cents,
            "biggest_leak": ({"label": r.biggest_leak.label, "amount_cents": r.biggest_leak.amount_cents}
                             if r.biggest_leak else None),
            "best_week_start": r.best_week_start.isoformat() if r.best_week_start else None,
        }
        return ToolResult(facts=facts, widgets=[_widget("limit_review", r)], sources=[r.source])


class SuggestChallengesTool(_HabitsTool):
    name = "suggest_challenges"
    description = (
        "Find one regular everyday habit in the customer's own transactions and offer a 7-day experiment, "
        "to be compared with the 7 days before. "
        "Use for 'help me improve my habits', 'give me a challenge', 'how can I spend less on X'."
    )

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_args(arguments, set())
        running = [i for i in self._svc().list_challenges(ctx.customer_id).items if i.challenge.status.value == "active"]
        if running:
            current = running[0]
            facts = {
                "already_running": True,
                "title": current.challenge.title, "days_left": current.days_left, "on_track": current.on_track,
                "current_amount_cents": current.current_amount_cents,
                "note": ("The customer already has a 7-day challenge running. Say so in one friendly sentence, say how it is "
                         "going and that a new challenge can start when this one ends. Do not offer a new one now."),
            }
            return ToolResult(facts=facts, widgets=[_widget("challenge_progress", current)], sources=[current.source])
        s = self._svc().challenge_suggestions(ctx.customer_id)
        facts = {
            "count": len(s.items),
            "items": [{"title": t.title, "duration_days": int(t.duration_days),
                       "baseline_cents": t.baseline_cents, "baseline_count": t.baseline_count,
                       "target_cents": t.rule.amount_cents, "estimated_saving_cents": t.estimated_saving_cents,
                       "yearly_saving_cents": t.yearly_saving_cents, "reason": t.reason} for t in s.items],
            "note": ("The customer starts the experiment with the button on the card. The yearly figure is an "
                     "estimate, say so." if s.items
                     else "No regular everyday habit found yet. Say there is nothing suitable for an experiment "
                          "right now and point to the spending analysis."),
        }
        widgets = [_widget("challenge_suggestions", s)] if s.items else []
        return ToolResult(facts=facts, widgets=widgets)


class GetChallengeProgressTool(_HabitsTool):
    name = "get_challenge_progress"
    description = (
        "Show progress of the customer's challenges (days left, whether they are on track). "
        "Use for 'how is my challenge going'."
    )

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        _check_args(arguments, set())
        items = self._svc().list_challenges(ctx.customer_id).items
        if not items:
            return ToolResult(facts={"has_challenges": False, "note": "No challenge started yet. Offer suggestions."})
        shown = ([i for i in items if i.challenge.status.value == "active"] or items)[:MAX_PROGRESS_WIDGETS]
        facts = {
            "has_challenges": True,
            "items": [{"title": i.challenge.title, "status": i.challenge.status.value, "days_left": i.days_left,
                       "on_track": i.on_track, "current_amount_cents": i.current_amount_cents,
                       "current_count": i.current_count, "baseline_cents": i.baseline_cents,
                       "difference_cents": i.difference_cents, "change_pct": i.change_pct,
                       "next_step": i.next_step} for i in shown],
        }
        sources: list[Source] = [i.source for i in shown]
        return ToolResult(facts=facts, widgets=[_widget("challenge_progress", i) for i in shown], sources=sources)


TOOLS: list[AiTool] = [
    SuggestMonthlyLimitTool(), GetLimitProgressTool(), ReviewLimitTool(),
    SuggestChallengesTool(), GetChallengeProgressTool(),
]


def bind_service(service) -> None:
    """Connects the tools to the habits service (called once by the container)."""
    for tool in TOOLS:
        tool.service = service  # type: ignore[attr-defined]
