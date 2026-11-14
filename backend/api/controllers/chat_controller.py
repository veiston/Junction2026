from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from api.dependencies import get_chat_service
from api.security import CustomerId
from contracts.dto.chat import ChatRequest, ChatResponse
from contracts.interfaces.controllers.errors import ValidationFailed

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest, cid: CustomerId, chat: Annotated[Any, Depends(get_chat_service)]) -> Any:
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
    return chat.handle(cid, body)
