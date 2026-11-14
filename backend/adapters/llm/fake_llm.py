"""Scripted LlmClient for tests of other slices: returns queued LlmTurns in order."""
from __future__ import annotations

from collections.abc import Iterable

from contracts.interfaces.llm.llm_client import LlmMessage, LlmTurn, ToolSpec


class FakeLlm:
    def __init__(self, turns: Iterable[LlmTurn] = ()) -> None:
        self._turns = list(turns)
        self.calls: list[dict] = []  # recorded arguments, for assertions

    def push(self, turn: LlmTurn) -> None:
        self._turns.append(turn)

    def generate(
        self,
        messages: list[LlmMessage],
        tools: list[ToolSpec],
        force_tool: str | None = None,
        temperature: float = 0.3,
        timeout_s: float = 20.0,
    ) -> LlmTurn:
        self.calls.append(
            {"messages": messages, "tools": tools, "force_tool": force_tool,
             "temperature": temperature, "timeout_s": timeout_s}
        )
        if not self._turns:
            raise AssertionError("FakeLlm: no scripted turns left")
        return self._turns.pop(0)
