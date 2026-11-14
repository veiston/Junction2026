"""Tool registry: only names from TOOL_CATALOG are accepted."""
from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import TOOL_CATALOG, AiTool, ToolContext, ToolResult
from contracts.interfaces.llm.llm_client import ToolSpec

ALLOWED_NAMES = frozenset(n for names in TOOL_CATALOG.values() for n in names)
# The model must never choose whose data is read; these keys are dropped from its arguments.
_FORBIDDEN_ARGS = frozenset({"customer_id", "customerid", "token", "user_id"})


class UnknownTool(Exception):
    pass


class ToolRegistry:
    def __init__(self, tools: Iterable[AiTool]) -> None:
        self._tools: dict[str, AiTool] = {}
        for t in tools:
            if t.name not in ALLOWED_NAMES:
                raise ValueError(f"Tool '{t.name}' is not in TOOL_CATALOG.")
            if t.name in self._tools:
                raise ValueError(f"Duplicate tool '{t.name}'.")
            self._tools[t.name] = t

    def has(self, name: str) -> bool:
        return name in self._tools

    def specs(self) -> list[ToolSpec]:
        return [ToolSpec(t.name, t.description, t.parameters) for t in self._tools.values()]

    def run(self, ctx: ToolContext, name: str, arguments: dict[str, Any]) -> ToolResult:
        tool = self._tools.get(name)
        if tool is None:
            raise UnknownTool(name)
        if not isinstance(arguments, dict):
            raise ValidationFailed("Tool arguments must be an object.")
        clean = {k: v for k, v in arguments.items() if k.lower() not in _FORBIDDEN_ARGS}
        return tool.run(ctx, clean)


def default_registry(transaction_service, plan_service=None) -> ToolRegistry:
    from services.chat.foundation_tools import build_foundation_tools
    from services.habits.tools import TOOLS as HABITS
    from services.plan.tools import build_plan_tools
    from services.understand.tools import TOOLS as UNDERSTAND

    plan_tools: list[AiTool] = []
    if plan_service is not None:
        plan_tools = build_plan_tools(plan_service)
    return ToolRegistry([*build_foundation_tools(transaction_service), *UNDERSTAND, *plan_tools, *HABITS])
