"""Reads customer profiles from SQLite."""

from sqlmodel import Session

from models.database import Database
from models.entities.customer import Customer


class CustomerDao:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get_by_id(self, customer_id: str) -> Customer | None:
        """Return one customer by ID, or None when it does not exist."""
        with Session(self.database.engine) as session:
            return session.get(Customer, customer_id)
