"""Stores one bank transaction and its spending classification."""

from sqlmodel import Field, SQLModel


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"

    id: int | None = Field(default=None, primary_key=True)
    customer_id: str = Field(index=True)
    account_id: str = Field(index=True)
    tx_date: str = Field(index=True)
    tx_timestamp: str
    category: str
    tx_type: str
    amount_cents: int
    balance_after_cents: int
    merchant_id: str | None = None
    mcc: str | None = None
    spend_group: str
    flow: str
    basket: str | None = None
