"""Stores one monthly limit on everyday spending."""

from sqlmodel import Field, SQLModel


class SpendingLimit(SQLModel, table=True):
    __tablename__ = "spending_limits"

    id: int | None = Field(default=None, primary_key=True)
    customer_id: str = Field(index=True)
    month: str
    basket: str = "everyday"
    amount_cents: int
    status: str = "active"
    created_at: str
