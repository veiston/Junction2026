"""Stores one challenge a customer has started."""

from sqlmodel import Field, SQLModel


class Challenge(SQLModel, table=True):
    __tablename__ = "challenges"

    id: int | None = Field(default=None, primary_key=True)
    customer_id: str = Field(index=True)
    template_id: str
    title: str
    spend_group: str
    rule_kind: str
    rule_amount_cents: int | None = None
    rule_count: int | None = None
    start_date: str
    end_date: str
    status: str = "active"
