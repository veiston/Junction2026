"""Gemini implementation of the LlmClient port (decision 0011).

This is the only module that imports the Gemini SDK.
"""
from __future__ import annotations

import base64
import os
import uuid
from typing import Any

from google.genai import errors as genai_errors
from google.genai import types

from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, LlmTurn, ToolCall, ToolSpec

DEFAULT_MODEL = "gemini-2.5-flash"

_SAFETY_REASONS = {
    "SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION", "IMAGE_SAFETY",
    "IMAGE_PROHIBITED_CONTENT", "MODEL_ARMOR",
}
_ERROR_REASONS = {"MALFORMED_FUNCTION_CALL", "MALFORMED_RESPONSE", "OTHER", "UNEXPECTED_TOOL_CALL"}


def _enum_name(value: Any) -> str:
    return str(getattr(value, "name", value) or "")


# Gemini 3 requires the `thought_signature` of a function call to be sent back with the call.
# The port's ToolCall has no field for it, so it travels inside ToolCall.id as "<id>|<base64>".
_SIG_SEP = "|"


def _pack_id(call_id: str, signature: bytes | None) -> str:
    if not signature:
        return call_id
    return f"{call_id}{_SIG_SEP}{base64.b64encode(signature).decode('ascii')}"


def _unpack_id(packed: str | None) -> tuple[str | None, bytes | None]:
    if not packed or _SIG_SEP not in packed:
        return packed, None
    call_id, _, sig = packed.partition(_SIG_SEP)
    try:
        return call_id, base64.b64decode(sig)
    except ValueError:
        return call_id, None


class GeminiClient:
    def __init__(self, client: Any | None = None, model: str | None = None) -> None:
        """`client` is a google.genai.Client; inject a fake in tests."""
        if client is None:
            from google import genai

            client = genai.Client()  # reads GEMINI_API_KEY / GOOGLE_API_KEY
        self._client = client
        self._model = (
            model or os.environ.get("GEMINI_MODEL") or os.environ.get("GEMINI_DEFAULT_MODEL") or DEFAULT_MODEL
        )

    # -- mapping -------------------------------------------------------------------------
    @staticmethod
    def _declarations(tools: list[ToolSpec]) -> list[types.Tool]:
        if not tools:
            return []
        decls = [
            types.FunctionDeclaration(
                name=t.name, description=t.description, parameters_json_schema=t.parameters
            )
            for t in tools
        ]
        return [types.Tool(function_declarations=decls)]

    @staticmethod
    def _contents(messages: list[LlmMessage]) -> tuple[str | None, list[types.Content]]:
        system: list[str] = []
        contents: list[types.Content] = []
        for m in messages:
            if m.role == "system":
                system.append(m.text)
            elif m.role == "user":
                contents.append(types.Content(role="user", parts=[types.Part(text=m.text)]))
            elif m.role == "assistant":
                parts: list[types.Part] = []
                if m.text:
                    parts.append(types.Part(text=m.text))
                for c in m.tool_calls:
                    call_id, signature = _unpack_id(c.id)
                    parts.append(
                        types.Part(
                            function_call=types.FunctionCall(id=call_id, name=c.name, args=c.arguments),
                            thought_signature=signature,
                        )
                    )
                if parts:
                    contents.append(types.Content(role="model", parts=parts))
            else:  # tool result
                response_id, _ = _unpack_id(m.tool_call_id)
                part = types.Part(
                    function_response=types.FunctionResponse(
                        id=response_id, name=m.tool_name or "", response={"result": m.text}
                    )
                )
                contents.append(types.Content(role="user", parts=[part]))
        return ("\n\n".join(system) or None), contents

    @staticmethod
    def _to_turn(response: Any) -> LlmTurn:
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            block = getattr(getattr(response, "prompt_feedback", None), "block_reason", None)
            return LlmTurn(text="", tool_calls=[], finish_reason="safety" if block else "error")
        cand = candidates[0]
        text_parts: list[str] = []
        calls: list[ToolCall] = []
        for part in getattr(getattr(cand, "content", None), "parts", None) or []:
            if getattr(part, "function_call", None) is not None:
                fc = part.function_call
                call_id = fc.id or f"call_{uuid.uuid4().hex[:12]}"
                signature = getattr(part, "thought_signature", None)
                calls.append(
                    ToolCall(
                        id=_pack_id(call_id, signature if isinstance(signature, bytes) else None),
                        name=fc.name,
                        arguments=dict(fc.args or {}),
                    )
                )
            elif getattr(part, "text", None) and not getattr(part, "thought", False):
                text_parts.append(part.text)
        reason = _enum_name(getattr(cand, "finish_reason", None))
        if reason in _SAFETY_REASONS:
            finish = "safety"
        elif reason == "MAX_TOKENS":
            finish = "length"
        elif reason in _ERROR_REASONS:
            finish = "error"
        elif calls:
            finish = "tool_calls"
        else:
            finish = "stop"
        return LlmTurn(text="".join(text_parts), tool_calls=calls, finish_reason=finish)

    # -- port ----------------------------------------------------------------------------
    def generate(
        self,
        messages: list[LlmMessage],
        tools: list[ToolSpec],
        force_tool: str | None = None,
        temperature: float = 0.3,
        timeout_s: float = 20.0,
    ) -> LlmTurn:
        system, contents = self._contents(messages)
        tool_config = None
        if force_tool is not None:
            if force_tool not in {t.name for t in tools}:
                raise ValueError(f"force_tool {force_tool!r} is not among the given tools")
            tool_config = types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(
                    mode=types.FunctionCallingConfigMode.ANY, allowed_function_names=[force_tool]
                )
            )
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            tools=self._declarations(tools) or None,
            tool_config=tool_config,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            http_options=types.HttpOptions(timeout=int(timeout_s * 1000)),
        )
        try:
            response = self._client.models.generate_content(
                model=self._model, contents=contents, config=config
            )
        except genai_errors.APIError as e:
            raise LlmUnavailable(f"Gemini API error: {getattr(e, 'code', '')} {e}") from e
        except Exception as e:  # network, timeout (httpx), DNS, ...
            raise LlmUnavailable(f"Gemini unreachable: {type(e).__name__}: {e}") from e
        return self._to_turn(response)
