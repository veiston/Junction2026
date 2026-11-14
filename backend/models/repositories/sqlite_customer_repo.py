"""SQLite CustomerRepository."""

from __future__ import annotations

from contracts.interfaces.repositories.shared import CustomerRecord
from models.database import Database


class SqliteCustomerRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    def get(self, customer_id: str) -> CustomerRecord | None:
        with self._db.session() as con:
            row = con.execute(
                "SELECT customer_id, postal_code, age, age_band, region FROM customers WHERE customer_id = ?",
                (customer_id,),
            ).fetchone()
        return CustomerRecord(*row) if row else None

    def ids_in_group(self, age_band: str, region: str | None) -> list[str]:
        sql = "SELECT customer_id FROM customers WHERE age_band = ?"
        args: list[str] = [age_band]
        if region is not None:
            sql += " AND region = ?"
            args.append(region)
        with self._db.session() as con:
            return [r[0] for r in con.execute(sql + " ORDER BY customer_id", args)]
