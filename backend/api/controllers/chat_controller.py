from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header

from api.dependencies import get_chat_service, get_config
from api.security import CustomerId
from config import Config
from contracts.dto.chat import ChatRequest, ChatResponse
from contracts.interfaces.controllers.errors import LlmUnavailable, ValidationFailed

router = APIRouter()


class _UnavailableLlm:
    """Stands in when the LiteRT model cannot load: the orchestrator turns this into its
    friendly 'model unavailable' reply and logs the reason, instead of a server error."""

    def __init__(self, error: LlmUnavailable) -> None:
        self._error = error

    def generate(self, *args: Any, **kwargs: Any) -> Any:
        raise self._error


def _litert_client(config: Config) -> Any:
    from adapters.llm.litert_client import LiteRtClient
    from models.database import PROJECT_ROOT

    path = Path(config.litert_model_path)
    if config.litert_model_path and not path.is_absolute():
        path = PROJECT_ROOT / path
    try:
        return LiteRtClient.from_config(str(path) if config.litert_model_path else "", config.litert_backend)
    except LlmUnavailable as e:
        return _UnavailableLlm(e)


@router.post("/chat", response_model=ChatResponse)
def post_chat(
    body: ChatRequest,
    cid: CustomerId,
    chat: Annotated[Any, Depends(get_chat_service)],
    config: Annotated[Config, Depends(get_config)],
    x_model_provider: Annotated[str | None, Header(alias="X-Model-Provider")] = None,
    x_ngrok_url: Annotated[str | None, Header(alias="X-Ngrok-Url")] = None,
) -> Any:
    if (body.message is None) == (body.quick_action is None):
        raise ValidationFailed(
            "Send exactly one of message or quick_action.",
            [{"field": "message", "issue": "exactly one of message / quick_action"}],
        )
    if body.message is not None:
        text = body.message.strip()
        if not text:
            raise ValidationFailed("message must not be blank.", [{"field": "message", "issue": "blank"}])
        body = body.model_copy(update={"message": text})

    llm_override = None
    if x_model_provider == "local":
        from adapters.llm.ollama_client import OllamaClient

        base_url = (
            x_ngrok_url
            or config.ollama_base_url
            or os.environ.get("OLLAMA_BASE_URL")
            or os.environ.get("NGROK_URL")
            or "http://127.0.0.1:11434"
        )
        api_key = config.ollama_api_key or os.environ.get("NGROK_BASIC_AUTH", "")
        llm_override = OllamaClient.from_config(base_url, api_key, config.ollama_model)
    elif x_model_provider == "litert":
        llm_override = _litert_client(config)

    if llm_override is not None:
        return chat.handle(cid, body, llm_override=llm_override)
    return chat.handle(cid, body)
