"""SQLite repositories for limits and challenges. Every query filters by customer_id."""

from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime, timezone

from contracts.interfaces.repositories.habits import ChallengeRecord, LimitRecord
from models.database import DEFAULT_MIGRATIONS_PATH, Database

MIGRATION = "0003_habits.sql"


def ensure_schema(database: Database) -> None:
    """Create the habits tables when missing (the script is idempotent)."""
    script = (DEFAULT_MIGRATIONS_PATH / MIGRATION).read_text(encoding="utf-8")
    with database.session() as con:
        con.executescript(script)


class SqliteLimitRepository:
    _COLS = "id, customer_id, month, basket, amount_cents, status, created_at"

    def __init__(self, database: Database) -> None:
        self._db = database
        ensure_schema(database)

    @staticmethod
    def _record(r) -> LimitRecord:
        return LimitRecord(id=r[0], customer_id=r[1], month=r[2], basket=r[3],
                           amount_cents=r[4], status=r[5], created_at=r[6])

    def create(self, customer_id: str, month: str, amount_cents: int) -> LimitRecord:
        created = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._db.session() as con:
            cur = con.execute(
                "INSERT INTO spending_limits(customer_id, month, basket, amount_cents, status, created_at) "
                "VALUES (?, ?, 'everyday', ?, 'active', ?)",
                (customer_id, month, amount_cents, created),
            )
            row = con.execute(
                f"SELECT {self._COLS} FROM spending_limits WHERE id = ? AND customer_id = ?",
                (cur.lastrowid, customer_id),
            ).fetchone()
        return self._record(row)

    def active_for_month(self, customer_id: str, month: str) -> LimitRecord | None:
        with self._db.session() as con:
            row = con.execute(
                f"SELECT {self._COLS} FROM spending_limits WHERE customer_id = ? AND month = ? "
                "AND status = 'active' ORDER BY id DESC LIMIT 1",
                (customer_id, month),
            ).fetchone()
        return self._record(row) if row else None

    def get(self, customer_id: str, limit_id: int) -> LimitRecord | None:
        with self._db.session() as con:
            row = con.execute(
                f"SELECT {self._COLS} FROM spending_limits WHERE id = ? AND customer_id = ?",
                (limit_id, customer_id),
            ).fetchone()
        return self._record(row) if row else None

    def set_status(self, customer_id: str, limit_id: int, status: str) -> None:
        with self._db.session() as con:
            con.execute(
                "UPDATE spending_limits SET status = ? WHERE id = ? AND customer_id = ?",
                (status, limit_id, customer_id),
            )


class SqliteChallengeRepository:
    _COLS = ("id, customer_id, template_id, title, spend_group, rule_kind, rule_amount_cents, "
             "rule_count, start_date, end_date, status")

    def __init__(self, database: Database) -> None:
        self._db = database
        ensure_schema(database)

    @staticmethod
    def _record(r) -> ChallengeRecord:
        return ChallengeRecord(
            id=r[0], customer_id=r[1], template_id=r[2], title=r[3], spend_group=r[4], rule_kind=r[5],
            rule_amount_cents=r[6], rule_count=r[7], start_date=date.fromisoformat(r[8]),
            end_date=date.fromisoformat(r[9]), status=r[10],
        )

    def create(self, record: ChallengeRecord) -> ChallengeRecord:
        with self._db.session() as con:
            cur = con.execute(
                "INSERT INTO challenges(customer_id, template_id, title, spend_group, rule_kind, "
                "rule_amount_cents, rule_count, start_date, end_date, status) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (record.customer_id, record.template_id, record.title, record.spend_group, record.rule_kind,
                 record.rule_amount_cents, record.rule_count, record.start_date.isoformat(),
                 record.end_date.isoformat(), record.status),
            )
        return replace(record, id=cur.lastrowid)

    def list(self, customer_id: str) -> list[ChallengeRecord]:
        with self._db.session() as con:
            rows = con.execute(
                f"SELECT {self._COLS} FROM challenges WHERE customer_id = ? ORDER BY id DESC", (customer_id,)
            ).fetchall()
        return [self._record(r) for r in rows]

    def active_with_template(self, customer_id: str, template_id: str) -> ChallengeRecord | None:
        with self._db.session() as con:
            row = con.execute(
                f"SELECT {self._COLS} FROM challenges WHERE customer_id = ? AND template_id = ? "
                "AND status = 'active' ORDER BY id DESC LIMIT 1",
                (customer_id, template_id),
            ).fetchone()
        return self._record(row) if row else None

    def set_status(self, customer_id: str, challenge_id: int, status: str) -> None:
        with self._db.session() as con:
            con.execute(
                "UPDATE challenges SET status = ? WHERE id = ? AND customer_id = ?",
                (status, challenge_id, customer_id),
            )
