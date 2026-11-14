"""Creates the SQLite database and applies its updates."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from sqlmodel import create_engine


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = PROJECT_ROOT / "db" / "money_coach.sqlite3"
DEFAULT_MIGRATIONS_PATH = PROJECT_ROOT / "db" / "migrations"


class Database:
    """SQLite migration runner; SQLModel models are the application-facing schema."""

    def __init__(
        self,
        path: Path = DEFAULT_DATABASE_PATH,
        migrations_path: Path = DEFAULT_MIGRATIONS_PATH,
    ) -> None:
        self.path = path
        self.migrations_path = migrations_path
        self.engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def migrate(self) -> None:
        connection = self.connect()
        try:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY NOT NULL)"
            )
            applied = {row[0] for row in connection.execute("SELECT name FROM schema_migrations")}
            for migration in sorted(self.migrations_path.glob("*.sql")):
                if migration.name in applied:
                    continue
                connection.executescript(migration.read_text(encoding="utf-8"))
                connection.execute("INSERT INTO schema_migrations(name) VALUES (?)", (migration.name,))
            connection.commit()
        finally:
            connection.close()
