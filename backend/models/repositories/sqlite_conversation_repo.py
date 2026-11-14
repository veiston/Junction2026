"""SQLite ConversationRepository."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from contracts.interfaces.repositories.shared import StoredMessage
from models.database import Database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SqliteConversationRepository:
    def __init__(self, database: Database) -> None:
        self._db = database

    def create(self, customer_id: str) -> str:
        conversation_id = f"c_{uuid.uuid4().hex[:8]}"
        with self._db.session() as con:
            con.execute(
                "INSERT INTO conversations(id, customer_id, created_at) VALUES (?, ?, ?)",
                (conversation_id, customer_id, _now()),
            )
        return conversation_id

    def owner_of(self, conversation_id: str) -> str | None:
        with self._db.session() as con:
            row = con.execute("SELECT customer_id FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
        return row[0] if row else None

    def append(self, conversation_id: str, role: str, text: str, widgets_json: str = "[]") -> None:
        with self._db.session() as con:
            con.execute(
                "INSERT INTO messages(conversation_id, role, text, widgets_json, created_at) VALUES (?, ?, ?, ?, ?)",
                (conversation_id, role, text, widgets_json, _now()),
            )

    def recent(self, conversation_id: str, limit: int = 10) -> list[StoredMessage]:
        with self._db.session() as con:
            rows = con.execute(
                "SELECT role, text, widgets_json, created_at FROM messages WHERE conversation_id = ? "
                "ORDER BY id DESC LIMIT ?",
                (conversation_id, limit),
            ).fetchall()
        return [StoredMessage(*r) for r in reversed(rows)]
