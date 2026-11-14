"""LiteRT-LM implementation of the LlmClient port: Google's on-device runtime, in-process.

Works like the Ollama adapter (a local model for sensitive data that only writes answers),
but the model runs inside the backend process, with no separate server.
Only imports `litert_lm` inside `from_config`, so the rest of the app never needs it.
"""
from __future__ import annotations

import threading
from functools import lru_cache
from pathlib import Path
from typing import Any

from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, LlmTurn, ToolSpec

TOOL_FACTS_TEMPLATE = "Facts from {tool_name} (amounts in euro cents): {text}"
MAX_OUTPUT_TOKENS = 512  # replies are 2-4 short sentences
BACKENDS = ("cpu", "gpu")

# The docs do not say an Engine is thread-safe: one answer at a time per process.
_lock = threading.Lock()


def _text(role: str, text: str) -> dict[str, Any]:
    return {"role": role, "content": [{"type": "text", "text": text}]}


def _to_litert_message(message: LlmMessage) -> dict[str, Any] | None:
    if message.role == "tool":
        return _text("user", TOOL_FACTS_TEMPLATE.format(tool_name=message.tool_name, text=message.text))
    if message.role == "assistant" and not message.text:
        return None  # only tool calls: the local model has no tools
    return _text(message.role, message.text)


def _split(messages: list[LlmMessage]) -> tuple[list[dict[str, Any]], str]:
    """(history to seed the conversation, the last user-side text to send)."""
    converted = [m for m in (_to_litert_message(x) for x in messages) if m is not None]
    if not converted or converted[-1]["role"] != "user":
        raise LlmUnavailable("LiteRT: nothing to answer (the last message is not from the user side).")
    last = converted.pop()
    return converted, last["content"][0]["text"]


def _reply_text(response: Any) -> str:
    """send_message returns a dict-like message: {'role': ..., 'content': [{'type': 'text', 'text': ...}]}."""
    try:
        parts = response["content"]
    except (KeyError, TypeError):
        return ""
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type", "text") == "text").strip()


@lru_cache(maxsize=2)
def _load_engine(model_path: str, backend: str) -> Any:
    """Loading a model takes seconds and gigabytes, so each model is loaded once per process."""
    import litert_lm

    litert_lm.set_min_log_severity(litert_lm.LogSeverity.ERROR)
    chosen = litert_lm.Backend.GPU() if backend == "gpu" else litert_lm.Backend.CPU()
    return litert_lm.Engine(model_path, backend=chosen)


class LiteRtClient:
    def __init__(self, engine: Any) -> None:
        """`engine` is a litert_lm.Engine; inject a fake in tests."""
        self._engine = engine

    @classmethod
    def from_config(cls, model_path: str, backend: str = "cpu") -> LiteRtClient:
        if not model_path:
            raise LlmUnavailable("LiteRT model is not set: put LITERT_MODEL_PATH in .env (a .litertlm file).")
        if not Path(model_path).is_file():
            raise LlmUnavailable(f"LiteRT model file not found: {model_path}")
        if backend not in BACKENDS:
            raise LlmUnavailable(f"LITERT_BACKEND must be one of {BACKENDS}, not {backend!r}.")
        try:
            engine = _load_engine(str(Path(model_path).resolve()), backend)
        except ImportError as e:
            raise LlmUnavailable("LiteRT is not installed: run uv sync in backend/.") from e
        except Exception as e:  # bad file, unsupported backend, out of memory, ...
            raise LlmUnavailable(f"LiteRT could not load the model: {type(e).__name__}: {e}") from e
        return cls(engine)

    def generate(
        self,
        messages: list[LlmMessage],
        tools: list[ToolSpec],
        force_tool: str | None = None,
        temperature: float = 0.3,
        timeout_s: float = 20.0,
    ) -> LlmTurn:
        """Only writes answers, like the Ollama adapter: `tools` and `force_tool` are ignored because
        the router sends sensitive requests here and the local model never calls tools.
        `temperature` and `timeout_s` are ignored in this spike (the model's defaults apply)."""
        history, last = _split(messages)
        try:
            with _lock, self._engine.create_conversation(
                messages=history, automatic_tool_calling=False, max_output_tokens=MAX_OUTPUT_TOKENS
            ) as conversation:
                response = conversation.send_message(last)
        except Exception as e:
            raise LlmUnavailable(f"LiteRT failed: {type(e).__name__}: {e}") from e
        text = _reply_text(response)
        if not text:
            return LlmTurn("", [], "error")
        return LlmTurn(text, [], "stop")
