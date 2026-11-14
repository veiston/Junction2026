"""Ollama implementation of the LlmClient port: a local model for sensitive data.

Only imports the ollama SDK inside `from_config`.
"""
from __future__ import annotations

from typing import Any

from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, LlmTurn, ToolSpec

LOCAL_TIMEOUT_S = 50  # the app waits 60 s for a chat turn
CONTEXT_LENGTH = 16384  # Ollama's default is too small for the facts and the history
TOOL_FACTS_TEMPLATE = "Facts from {tool_name} (amounts in euro cents): {text}"


def _to_ollama_message(message: LlmMessage) -> dict[str, str] | None:
    if message.role == "tool":
        text = TOOL_FACTS_TEMPLATE.format(tool_name=message.tool_name, text=message.text)
        return {"role": "user", "content": text}
    if message.role == "assistant" and not message.text:
        return None  # only tool calls: the local model has no tools
    return {"role": message.role, "content": message.text}


def _to_ollama_messages(messages: list[LlmMessage]) -> list[dict[str, str]]:
    converted = [_to_ollama_message(m) for m in messages]
    return [m for m in converted if m is not None]


class OllamaClient:
    def __init__(self, client: Any, model: str) -> None:
        """`client` is an ollama.Client; inject a fake in tests."""
        self._client = client
        self._model = model

    @classmethod
    def from_config(cls, base_url: str, api_key: str, model: str) -> OllamaClient:
        import base64
        import ollama

        headers = {}
        if api_key:
            if ":" in api_key and not api_key.startswith("Basic "):
                b64 = base64.b64encode(api_key.encode("utf-8")).decode("ascii")
                headers["Authorization"] = f"Basic {b64}"
            elif api_key.startswith("Basic ") or api_key.startswith("Bearer "):
                headers["Authorization"] = api_key
            else:
                headers["Authorization"] = f"Bearer {api_key}"
        client = ollama.Client(host=base_url, headers=headers, timeout=LOCAL_TIMEOUT_S)
        return cls(client, model)

    def generate(
        self,
        messages: list[LlmMessage],
        tools: list[ToolSpec],
        force_tool: str | None = None,
        temperature: float = 0.3,
        timeout_s: float = 20.0,
    ) -> LlmTurn:
        """Only writes answers: `tools` and `force_tool` are ignored because the router
        sends sensitive requests here and the local model never calls tools.
        `timeout_s` is ignored too: the client timeout is fixed in `from_config`."""
        options = {"temperature": temperature, "num_ctx": CONTEXT_LENGTH}
        try:
            response = self._client.chat(
                model=self._model, messages=_to_ollama_messages(messages), think=False, options=options
            )
        except Exception as e:  # network, timeout, unknown model, ...
            raise LlmUnavailable(f"Ollama unreachable: {type(e).__name__}: {e}") from e
        text = response.message.content
        if not text:
            return LlmTurn("", [], "error")
        return LlmTurn(text, [], "stop")
