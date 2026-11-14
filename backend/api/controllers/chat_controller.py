from __future__ import annotations

import os
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header

from api.dependencies import get_chat_service, get_config
from api.security import CustomerId
from config import Config
from contracts.dto.chat import ChatRequest, ChatResponse
from contracts.interfaces.controllers.errors import ValidationFailed

router = APIRouter()


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

    if llm_override is not None:
        return chat.handle(cid, body, llm_override=llm_override)
    return chat.handle(cid, body)
