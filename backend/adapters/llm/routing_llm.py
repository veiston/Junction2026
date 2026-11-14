"""LlmClient that keeps sensitive requests on the local model.

Tool results carry the customer's money figures, so once a conversation has one,
only the local model may see it. Everything else goes to the cloud model.
"""
from __future__ import annotations

from contracts.interfaces.llm.llm_client import LlmClient, LlmMessage, LlmTurn, ToolSpec


def _is_sensitive(messages: list[LlmMessage]) -> bool:
    return any(m.role == "tool" for m in messages)


def _without_assistant_messages(messages: list[LlmMessage]) -> list[LlmMessage]:
    # earlier answers quote money figures
    return [m for m in messages if m.role != "assistant"]


class PrivacyRoutingLlm:
    def __init__(self, cloud: LlmClient, local: LlmClient) -> None:
        self._cloud = cloud
        self._local = local

    def generate(
        self,
        messages: list[LlmMessage],
        tools: list[ToolSpec],
        force_tool: str | None = None,
        temperature: float = 0.3,
        timeout_s: float = 20.0,
    ) -> LlmTurn:
        """A local failure raises LlmUnavailable: it never falls back to the cloud."""
        if _is_sensitive(messages):
            return self._local.generate(messages, [], None, temperature, timeout_s)
        return self._cloud.generate(
            _without_assistant_messages(messages), tools, force_tool, temperature, timeout_s
        )
