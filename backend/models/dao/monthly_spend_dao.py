"""Reads ready-made monthly spending totals from SQLite."""

from sqlmodel import Session, select

from models.database import Database
from models.entities.monthly_spend import MonthlySpend


class MonthlySpendDao:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get_by_customer_and_period(
        self, customer_id: str, from_month: str, to_month: str
    ) -> list[MonthlySpend]:
        """Return a customer's monthly spending rows for an inclusive period."""
        with Session(self.database.engine) as session:
            statement = (
                select(MonthlySpend)
                .where(
                    MonthlySpend.customer_id == customer_id,
                    MonthlySpend.month >= from_month,
                    MonthlySpend.month <= to_month,
                )
                .order_by(MonthlySpend.month, MonthlySpend.spend_group)
            )
            return list(session.exec(statement))
