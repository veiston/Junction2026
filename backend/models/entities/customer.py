"""Stores one customer's basic profile data."""

from sqlmodel import Field, SQLModel


class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    customer_id: str = Field(primary_key=True)
    postal_code: str
    age: int
    age_band: str
    region: str
