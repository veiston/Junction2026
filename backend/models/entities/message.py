"""Stores one message from a customer or the assistant."""

from sqlmodel import Field, SQLModel


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: str = Field(index=True)
    role: str
    text: str
    widgets_json: str
    created_at: str
