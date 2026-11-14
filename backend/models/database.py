"""Creates the SQLite database and applies its updates."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

from sqlmodel import create_engine


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]


def db_dir() -> Path:
    """The `db/` folder: at the repository root, or the copy inside `backend/` when only `backend/` is deployed."""
    root = PROJECT_ROOT / "db"
    return root if (root / "migrations").is_dir() else BACKEND_DIR / "db"


DEFAULT_DATABASE_PATH = PROJECT_ROOT / "db" / "money_coach.sqlite3"
DEFAULT_MIGRATIONS_PATH = db_dir() / "migrations"


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

    @contextmanager
    def session(self):
        """Short-lived connection: commits on success, rolls back on error, always closes."""
        connection = self.connect()
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def meta(self, key: str) -> str | None:
        with self.session() as con:
            row = con.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def migrate(self) -> None:
        """Apply db/migrations/*.sql in order. Applied files are recorded in `meta` as `migration:<name>`."""
        with self.session() as connection:
            has_meta = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'meta'"
            ).fetchone()
            applied = (
                {r[0] for r in connection.execute("SELECT key FROM meta WHERE key LIKE 'migration:%'")}
                if has_meta
                else set()
            )
            for migration in sorted(self.migrations_path.glob("*.sql")):
                key = f"migration:{migration.name}"
                if key in applied:
                    continue
                connection.executescript(migration.read_text(encoding="utf-8"))
                connection.execute("INSERT INTO meta(key, value) VALUES (?, ?)", (key, "applied"))
