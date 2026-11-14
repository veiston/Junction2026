"""SQLite repository for the bell's notices. Every query filters by customer_id."""

from __future__ import annotations

from datetime import date

from contracts.dto.notifications import Notification
from models.database import DEFAULT_MIGRATIONS_PATH, Database

MIGRATION = "0004_notifications.sql"


def ensure_schema(database: Database) -> None:
    """Create the table when missing (the script is idempotent), so old databases work without a new ingest."""
    script = (DEFAULT_MIGRATIONS_PATH / MIGRATION).read_text(encoding="utf-8")
    with database.session() as con:
        con.executescript(script)


class SqliteNotificationRepository:
    def __init__(self, database: Database) -> None:
        self._db = database
        ensure_schema(database)

    def add(self, customer_id: str, notice: Notification) -> None:
        """Records a notice once; an id that already exists (read or not) is left alone."""
        with self._db.session() as con:
            con.execute(
                "INSERT OR IGNORE INTO notifications(customer_id, id, kind, created_date, read_date, payload) "
                "VALUES (?, ?, ?, ?, NULL, ?)",
                (customer_id, notice.id, notice.kind.value, notice.created_date.isoformat(),
                 notice.model_dump_json()),
            )

    def unread(self, customer_id: str) -> list[Notification]:
        """Newest first."""
        with self._db.session() as con:
            rows = con.execute(
                "SELECT payload FROM notifications WHERE customer_id = ? AND read_date IS NULL "
                "ORDER BY created_date DESC, id DESC",
                (customer_id,),
            ).fetchall()
        return [Notification.model_validate_json(r[0]) for r in rows]

    def last_created(self, customer_id: str, kind: str) -> date | None:
        with self._db.session() as con:
            row = con.execute(
                "SELECT max(created_date) FROM notifications WHERE customer_id = ? AND kind = ?",
                (customer_id, kind),
            ).fetchone()
        return date.fromisoformat(row[0]) if row and row[0] else None

    def mark_read(self, customer_id: str, notification_id: str, today: date) -> bool:
        """False when the customer never had this notice. Reading twice is fine."""
        with self._db.session() as con:
            known = con.execute(
                "SELECT 1 FROM notifications WHERE customer_id = ? AND id = ?", (customer_id, notification_id)
            ).fetchone()
            if not known:
                return False
            con.execute(
                "UPDATE notifications SET read_date = coalesce(read_date, ?) WHERE customer_id = ? AND id = ?",
                (today.isoformat(), customer_id, notification_id),
            )
        return True
