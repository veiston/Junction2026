"""Stores one customer's spending total for one month and group."""

from sqlmodel import Field, SQLModel


class MonthlySpend(SQLModel, table=True):
    __tablename__ = "monthly_spend"

    customer_id: str = Field(primary_key=True)
    month: str = Field(primary_key=True)
    category: str = Field(primary_key=True)
    spend_group: str = Field(primary_key=True)
    basket: str = Field(primary_key=True)
    flow: str = Field(primary_key=True)
    amount_cents: int
    tx_count: int
