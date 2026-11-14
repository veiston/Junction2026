from typing import Literal

from pydantic import Base64Bytes, BaseModel


class Attachment(BaseModel):
    mime_type: str  # e.g. image/png or application/pdf
    data: Base64Bytes


class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    text: str
    attachments: list[Attachment] = []
