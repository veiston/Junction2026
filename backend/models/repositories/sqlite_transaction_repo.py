"""SQLite TransactionRepository. Every query filters by customer_id and by Clock.today()."""

from __future__ import annotations

from datetime import date

from contracts.dto.transactions import Transaction, TransactionFilter, TransactionPage
from contracts.interfaces.repositories.shared import Clock, SumResult
from models.database import Database
from models.repositories._sql import TX_COLUMNS, row_to_transaction


class SqliteTransactionRepository:
    def __init__(self, database: Database, clock: Clock) -> None:
        self._db = database
        self._clock = clock

    def _where(self, customer_id: str, flt: TransactionFilter) -> tuple[str, list]:
        today = self._clock.today()
        # Default period: the current month up to today (same as the fake).
        from_date = flt.from_date or today.replace(day=1)
        to_date = min(flt.to_date or today, today)
        sql = "t.customer_id = ? AND t.tx_date >= ? AND t.tx_date <= ?"
        args: list = [customer_id, from_date.isoformat(), to_date.isoformat()]
        for column, value in (
            ("basket", flt.basket), ("category", flt.category),
            ("spend_group", flt.spend_group), ("flow", flt.flow),
        ):
            if value is not None:
                sql += f" AND t.{column} = ?"
                args.append(getattr(value, "value", value))
        if flt.min_abs_amount_cents is not None:
            sql += " AND abs(t.amount_cents) >= ?"
            args.append(flt.min_abs_amount_cents)
        return sql, args

    def page(self, customer_id: str, flt: TransactionFilter, page: int, page_size: int) -> TransactionPage:
        where, args = self._where(customer_id, flt)
        with self._db.session() as con:
            total, amount = con.execute(
                f"SELECT count(*), coalesce(sum(t.amount_cents), 0) FROM transactions t WHERE {where}", args
            ).fetchone()
            rows = con.execute(
                f"SELECT {TX_COLUMNS} FROM transactions t WHERE {where} "
                "ORDER BY t.tx_timestamp DESC, t.id DESC LIMIT ? OFFSET ?",
                [*args, page_size, (page - 1) * page_size],
            ).fetchall()
        return TransactionPage(
            items=[row_to_transaction(r) for r in rows],
            page=page, page_size=page_size, total=total, total_amount_cents=amount,
        )

    def sum(self, customer_id: str, flt: TransactionFilter) -> SumResult:
        where, args = self._where(customer_id, flt)
        with self._db.session() as con:
            count, amount = con.execute(
                f"SELECT count(*), coalesce(sum(t.amount_cents), 0) FROM transactions t WHERE {where}", args
            ).fetchone()
        return SumResult(amount_cents=amount, tx_count=count)

    def all_between(self, customer_id: str, from_date: date, to_date: date) -> list[Transaction]:
        to_date = min(to_date, self._clock.today())
        with self._db.session() as con:
            rows = con.execute(
                f"SELECT {TX_COLUMNS} FROM transactions t WHERE t.customer_id = ? "
                "AND t.tx_date >= ? AND t.tx_date <= ? ORDER BY t.tx_timestamp, t.id",
                (customer_id, from_date.isoformat(), to_date.isoformat()),
            ).fetchall()
        return [row_to_transaction(r) for r in rows]

    def balance_on(self, customer_id: str, day: date) -> int:
        day = min(day, self._clock.today())
        with self._db.session() as con:
            row = con.execute(
                "SELECT balance_after_cents FROM transactions WHERE customer_id = ? AND tx_date <= ? "
                "ORDER BY tx_timestamp DESC, id DESC LIMIT 1",
                (customer_id, day.isoformat()),
            ).fetchone()
        return row[0] if row else 0
