"""SQLite MonthlySpendRepository over the table built at ingest."""

from __future__ import annotations

from contracts.interfaces.repositories.shared import Clock, MonthlySpendRow
from models.database import Database

_COLS = "customer_id, month, category, spend_group, basket, flow, amount_cents, tx_count"


class SqliteMonthlySpendRepository:
    def __init__(self, database: Database, clock: Clock) -> None:
        self._db = database
        self._clock = clock

    def _rows(self, customer_ids: list[str], from_month: str, to_month: str) -> list[tuple[str, MonthlySpendRow]]:
        if not customer_ids:
            return []
        today = self._clock.today()
        current = today.strftime("%Y-%m")
        to_month = min(to_month, current)  # months after today are excluded
        marks = ",".join("?" * len(customer_ids))
        with self._db.session() as con:
            rows = con.execute(
                f"SELECT {_COLS} FROM monthly_spend WHERE customer_id IN ({marks}) "
                "AND month >= ? AND month <= ? ORDER BY customer_id, month, spend_group, category",
                [*customer_ids, from_month, to_month],
            ).fetchall()
            out = [
                (r[0], MonthlySpendRow(month=r[1], category=r[2], spend_group=r[3], basket=r[4] or None,
                                       flow=r[5], amount_cents=r[6], tx_count=r[7]))
                for r in rows
                if r[1] != current
            ]
            if from_month <= current <= to_month:
                # The month of today is cut at today: re-aggregate from transactions.
                cut = con.execute(
                    f"SELECT customer_id, substr(tx_date,1,7), category, spend_group, coalesce(basket,''), flow, "
                    f"sum(amount_cents), count(*) FROM transactions WHERE customer_id IN ({marks}) "
                    "AND tx_date >= ? AND tx_date <= ? "
                    "GROUP BY customer_id, category, spend_group, coalesce(basket,''), flow "
                    "ORDER BY customer_id, spend_group, category",
                    [*customer_ids, current + "-01", today.isoformat()],
                ).fetchall()
                out.extend(
                    (r[0], MonthlySpendRow(month=r[1], category=r[2], spend_group=r[3], basket=r[4] or None,
                                           flow=r[5], amount_cents=r[6], tx_count=r[7]))
                    for r in cut
                )
        return sorted(out, key=lambda p: (p[0], p[1].month))

    def for_customer(self, customer_id: str, from_month: str, to_month: str) -> list[MonthlySpendRow]:
        return [row for _, row in self._rows([customer_id], from_month, to_month)]

    def for_customers(
        self, customer_ids: list[str], from_month: str, to_month: str
    ) -> list[tuple[str, MonthlySpendRow]]:
        return self._rows(customer_ids, from_month, to_month)
