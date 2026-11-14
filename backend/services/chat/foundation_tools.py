"""Foundation AI tools: list_transactions, explain_concept."""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any

from pydantic import ValidationError

from contracts.dto.common import Period, Source
from contracts.dto.transactions import TransactionFilter, TransactionListData
from contracts.dto.widgets import Widget
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import ToolContext, ToolResult
from services.chat.glossary import CONCEPT_IDS, render_concept

DEFAULT_DAYS = 30
MAX_LIMIT = 20
EXPLAIN_DAYS = 28


def _parse_date(args: dict[str, Any], key: str) -> date | None:
    v = args.get(key)
    if v is None:
        return None
    try:
        return date.fromisoformat(v)
    except (TypeError, ValueError):
        raise ValidationFailed(f"{key} must be YYYY-MM-DD.", [{"field": key, "issue": "bad date"}]) from None


class ListTransactionsTool:
    name = "list_transactions"
    description = (
        "Show the customer's latest transactions, optionally filtered by period, category, basket or flow. "
        "Use for 'show my transactions', 'what did I buy', 'my biggest payments'."
    )
    parameters = {
        "type": "object",
        "properties": {
            "from_date": {"type": "string", "description": "YYYY-MM-DD. Default: 30 days ago."},
            "to_date": {"type": "string", "description": "YYYY-MM-DD. Default: today."},
            "basket": {"type": "string", "enum": ["mandatory_regular", "mandatory_irregular", "everyday"]},
            "flow": {"type": "string", "enum": ["spending", "income", "saving", "transfer"]},
            "min_abs_amount_cents": {"type": "integer", "minimum": 0},
            "limit": {"type": "integer", "minimum": 1, "maximum": MAX_LIMIT, "description": "Rows to show, default 5."},
        },
        "additionalProperties": False,
    }

    def __init__(self, transactions) -> None:
        self._svc = transactions

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        unknown = set(arguments) - set(self.parameters["properties"])
        if unknown:
            raise ValidationFailed(f"Unknown arguments: {sorted(unknown)}.")
        limit = arguments.get("limit", 5)
        if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= MAX_LIMIT:
            raise ValidationFailed(f"limit must be 1..{MAX_LIMIT}.", [{"field": "limit", "issue": "out of range"}])
        to_date = _parse_date(arguments, "to_date") or ctx.today
        from_date = _parse_date(arguments, "from_date") or (to_date - timedelta(days=DEFAULT_DAYS))
        try:
            flt = TransactionFilter(
                from_date=from_date,
                to_date=to_date,
                basket=arguments.get("basket"),
                flow=arguments.get("flow"),
                min_abs_amount_cents=arguments.get("min_abs_amount_cents"),
            )
        except ValidationError as e:
            raise ValidationFailed("Invalid filter.", [{"field": ".".join(map(str, x["loc"])), "issue": x["msg"]} for x in e.errors()]) from None
        page = self._svc.list(ctx.customer_id, flt, 1, limit)
        data = TransactionListData(title="Latest transactions", filter=flt, page=page)
        widget = Widget(id=f"w_{uuid.uuid4().hex[:6]}", type="transaction_list", version=1, data=data.model_dump(mode="json"))
        facts: dict[str, Any] = {
            "period": f"{flt.from_date}..{flt.to_date}",
            "matching_count": page.total,
            "shown_count": len(page.items),
            "total_amount_cents": page.total_amount_cents,
        }
        if page.items:
            top = page.items[0]
            facts["latest"] = {"date": str(top.date), "label": top.label, "amount_cents": top.amount_cents}
        source = Source(
            description="Calculated from your transactions",
            period=Period(from_date=flt.from_date, to_date=flt.to_date),
            tx_count=page.total,
        )
        return ToolResult(facts=facts, widgets=[widget], sources=[source])


class ExplainConceptTool:
    name = "explain_concept"
    description = (
        "Explain one money concept in plain language from the fixed glossary, optionally with the customer's own "
        "numbers for a spending group. Use for 'explain this', 'what is ...', 'why does it matter'."
    )
    parameters = {
        "type": "object",
        "properties": {
            "concept_id": {"type": "string", "enum": list(CONCEPT_IDS)},
            "spend_group": {"type": "string",
                            "description": "Optional spend group (for example taxis) to fill in the customer's numbers."},
        },
        "required": ["concept_id"],
        "additionalProperties": False,
    }

    def __init__(self, transactions) -> None:
        self._svc = transactions

    def _weekly_cents(self, ctx: ToolContext, spend_group: str) -> int:
        to_date = ctx.today - timedelta(days=1)
        try:
            flt = TransactionFilter(from_date=to_date - timedelta(days=EXPLAIN_DAYS - 1), to_date=to_date,
                                    basket="everyday", flow="spending", spend_group=spend_group)
        except ValidationError:
            raise ValidationFailed("Unknown spend_group.", [{"field": "spend_group", "issue": "unknown"}]) from None
        page = self._svc.list(ctx.customer_id, flt, 1, 1)
        return -page.total_amount_cents * 7 // EXPLAIN_DAYS

    def run(self, ctx: ToolContext, arguments: dict[str, Any]) -> ToolResult:
        unknown = set(arguments) - set(self.parameters["properties"])
        if unknown:
            raise ValidationFailed(f"Unknown arguments: {sorted(unknown)}.")
        concept_id = arguments.get("concept_id")
        if not isinstance(concept_id, str):
            raise ValidationFailed("concept_id is required.", [{"field": "concept_id", "issue": "required"}])
        numbers: dict[str, int] = {}
        group = arguments.get("spend_group")
        if group is not None:
            if not isinstance(group, str):
                raise ValidationFailed("spend_group must be a string.", [{"field": "spend_group", "issue": "bad type"}])
            weekly = self._weekly_cents(ctx, group)
            if weekly > 0:
                numbers = {"weekly": weekly, "yearly": weekly * 52}
        note = render_concept(concept_id, **numbers)
        widget = Widget(id=f"w_{uuid.uuid4().hex[:6]}", type="concept_note", version=1,
                        data=note.model_dump(mode="json"))
        return ToolResult(facts={"title": note.title, "text": note.text}, widgets=[widget])


def build_foundation_tools(transactions) -> list:
    return [ListTransactionsTool(transactions), ExplainConceptTool(transactions)]
