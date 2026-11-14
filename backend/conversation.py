from pathlib import Path
from typing import Literal

from pydantic import Base64Bytes, BaseModel

# Load the system prompt from an external file (It got so long)
SYSTEM_PROMPT = (Path(__file__).parent / "system_prompt.txt").read_text(encoding="utf-8")


class Attachment(BaseModel):
    mime_type: str  # e.g. image/png or application/pdf
    data: Base64Bytes


class Message(BaseModel):
    role: Literal["user", "model"]
    text: str
    attachments: list[Attachment] = []
