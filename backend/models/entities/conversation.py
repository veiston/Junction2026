"""Stores one customer's chat conversation."""

from sqlmodel import Field, SQLModel


class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    id: str = Field(primary_key=True)
    customer_id: str = Field(index=True)
    created_at: str
