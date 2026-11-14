"""Chat orchestrator: LLM tool loop. customer_id comes from the caller only."""
from __future__ import annotations

import json
import re
import logging
import uuid
from datetime import datetime, timezone

from contracts.dto.chat import AssistantMessage, ChatRequest, ChatResponse
from contracts.dto.common import Source
from contracts.dto.widgets import Widget
from contracts.interfaces.controllers.errors import (
    AppError,
    LlmUnavailable,
    NotFound,
    ValidationFailed,
)
from contracts.interfaces.llm.ai_tool import QUICK_ACTION_TOOL, ToolContext
from contracts.interfaces.llm.llm_client import LlmClient, LlmMessage, LlmTurn
from contracts.interfaces.repositories.shared import Clock, ConversationRepository
from services.chat import prompts
from services.chat.tool_registry import ToolRegistry, UnknownTool

log = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 4
MAX_WIDGETS = 1  # one chart per answer keeps the chat readable


_HELP = re.compile(r"\b(what can you do|what do you do|how can you help|what are you able|what can i ask)\b", re.I)


def asks_for_help(text: str) -> bool:
    """True when the customer asks what the coach can do, so the three sections are offered as pills."""
    return bool(_HELP.search(text))


class ChatOrchestrator:
    def __init__(
        self,
        llm: LlmClient,
        registry: ToolRegistry,
        conversations: ConversationRepository,
        clock: Clock,
    ) -> None:
        self._llm = llm
        self._registry = registry
        self._conversations = conversations
        self._clock = clock

    # ------------------------------------------------------------------ public
    def handle(self, customer_id: str, request: ChatRequest, llm_override: LlmClient | None = None) -> ChatResponse:
        if (request.message is None) == (request.quick_action is None):
            raise ValidationFailed("Send exactly one of message or quick_action.")
        if request.message is not None and not request.message.strip():
            raise ValidationFailed("message must not be empty.", [{"field": "message", "issue": "empty"}])

        conv_id = request.conversation_id
        if conv_id is None:
            conv_id = self._conversations.create(customer_id)
        elif self._conversations.owner_of(conv_id) != customer_id:
            raise NotFound("Conversation not found.")  # same answer for "missing" and "someone else's"

        history = [
            LlmMessage(role=m.role, text=m.text)  # type: ignore[arg-type]
            for m in self._conversations.recent(conv_id, 10)
            if m.role in ("user", "assistant") and m.text
        ]

        force_tool: str | None = None
        if request.quick_action is not None:
            qa = request.quick_action.value
            user_text = prompts.QUICK_ACTION_TEXT[qa]
            tool_name = QUICK_ACTION_TOOL[qa]
            if not self._registry.has(tool_name):
                self._conversations.append(conv_id, "user", user_text)
                return self._finish(conv_id, prompts.COMING_SOON, [], [])
            force_tool = tool_name
        else:
            user_text = request.message.strip()  # type: ignore[union-attr]

        self._conversations.append(conv_id, "user", user_text)
        ctx = ToolContext(customer_id=customer_id, today=self._clock.today(), conversation_id=conv_id)
        pills: list[str] = []
        text, widgets, sources = self._loop(ctx, history, user_text, force_tool, pills, llm_override=llm_override)
        return self._finish(conv_id, text, widgets, sources, asks_for_help(user_text), pills)

    # ------------------------------------------------------------------ loop
    def _loop(
        self,
        ctx: ToolContext,
        history: list[LlmMessage],
        user_text: str,
        force_tool: str | None,
        pills: list[str] | None = None,
        llm_override: LlmClient | None = None,
    ) -> tuple[str, list[Widget], list[Source]]:
        client = llm_override or self._llm
        if llm_override and force_tool and hasattr(self._llm, "generate"):
            from adapters.llm.routing_llm import PrivacyRoutingLlm
            client = PrivacyRoutingLlm(self._llm, llm_override)

        messages = [
            LlmMessage(role="system", text=prompts.SYSTEM_PROMPT.format(today=ctx.today.isoformat())),
            *history,
            LlmMessage(role="user", text=user_text),
        ]
        specs = self._registry.specs()
        widgets: list[Widget] = []
        sources: list[Source] = []
        arg_errors = 0

        for round_no in range(MAX_TOOL_ROUNDS + 1):
            try:
                turn: LlmTurn = client.generate(
                    messages, specs, force_tool=force_tool if round_no == 0 else None
                )
            except LlmUnavailable as e:
                # The user sees a friendly message; the real reason goes to the backend log.
                log.warning("LLM unavailable in round %d: %s", round_no, e)
                return (prompts.LLM_DOWN_WITH_CARD if widgets else prompts.LLM_DOWN), widgets, sources

            if turn.finish_reason == "safety":
                return prompts.OFF_TOPIC, widgets, sources
            if turn.finish_reason == "error":
                return prompts.LLM_DOWN, widgets, sources
            if not turn.tool_calls:
                if any(w.type.value == "concept_note" for w in widgets):
                    return prompts.CONCEPT_INTRO, widgets, sources  # the card is the explanation, say it once
                return (turn.text.strip() or prompts.EMPTY_REPLY), widgets, sources
            if round_no == MAX_TOOL_ROUNDS:
                return prompts.TOO_MANY_ROUNDS, widgets, sources

            messages.append(LlmMessage(role="assistant", text=turn.text, tool_calls=list(turn.tool_calls)))
            for call in turn.tool_calls:
                if not self._registry.has(call.name):
                    return prompts.TOOL_PROBLEM, widgets, sources
                try:
                    result = self._registry.run(ctx, call.name, call.arguments)
                except UnknownTool:
                    return prompts.TOOL_PROBLEM, widgets, sources
                except ValidationFailed as e:
                    arg_errors += 1
                    if arg_errors > 1:
                        return prompts.TOOL_PROBLEM, widgets, sources
                    payload = {"error": e.message}
                else:
                    payload = result.facts
                    if call.name == "stop_challenge" and payload.get("stopped") and pills is not None:
                        pills.extend(prompts.AFTER_SKIP_SUGGESTIONS)
                    widgets.extend(result.widgets)
                    sources.extend(result.sources)
                messages.append(
                    LlmMessage(role="tool", text=json.dumps(payload), tool_call_id=call.id, tool_name=call.name)
                )
        return prompts.TOO_MANY_ROUNDS, widgets, sources  # pragma: no cover

    # ------------------------------------------------------------------ output
    def _finish(
        self, conv_id: str, text: str, widgets: list[Widget], sources: list[Source], show_sections: bool = False,
        pills: list[str] | None = None,
    ) -> ChatResponse:
        widgets = widgets[:MAX_WIDGETS]
        self._conversations.append(
            conv_id, "assistant", text, json.dumps([w.model_dump(mode="json") for w in widgets])
        )
        msg = AssistantMessage(
            id=f"m_{uuid.uuid4().hex[:8]}",
            role="assistant",
            created_at=datetime.now(timezone.utc),
            text=text,
            widgets=widgets,
            suggestions=list(pills or (prompts.SECTION_SUGGESTIONS if show_sections else prompts.DEFAULT_SUGGESTIONS)),
            sources=sources,
            disclaimer=None,
        )
        return ChatResponse(conversation_id=conv_id, message=msg)
