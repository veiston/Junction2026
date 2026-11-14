"""Reads one customer's transactions and balances from SQLite."""

from sqlmodel import Session, select

from models.database import Database
from models.entities.transaction import Transaction


class TransactionDao:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get_by_customer_id(
        self, customer_id: str, limit: int = 20, offset: int = 0
    ) -> list[Transaction]:
        """Return a page of one customer's transactions, newest first."""
        with Session(self.database.engine) as session:
            statement = (
                select(Transaction)
                .where(Transaction.customer_id == customer_id)
                .order_by(Transaction.tx_timestamp.desc(), Transaction.id.desc())
                .offset(offset)
                .limit(limit)
            )
            return list(session.exec(statement))

    def get_balance_by_date(self, customer_id: str, date: str) -> int | None:
        """Return the latest balance recorded on or before a date."""
        with Session(self.database.engine) as session:
            statement = (
                select(Transaction.balance_after_cents)
                .where(Transaction.customer_id == customer_id, Transaction.tx_date <= date)
                .order_by(Transaction.tx_date.desc(), Transaction.id.desc())
                .limit(1)
            )
            return session.exec(statement).first()
