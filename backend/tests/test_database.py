"""Checks that the SQLite database tables are created safely."""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from models.database import Database


class DatabaseMigrationTests(unittest.TestCase):
    def test_migrate_creates_core_and_chat_tables_idempotently(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Database(Path(directory) / "money_coach.sqlite3")

            database.migrate()
            database.migrate()

            connection = sqlite3.connect(database.path)
            try:
                tables = {
                    row[0]
                    for row in connection.execute(
                        "SELECT name FROM sqlite_master WHERE type = 'table'"
                    )
                }
                migrations = connection.execute(
                    "SELECT name FROM schema_migrations ORDER BY name"
                ).fetchall()
            finally:
                connection.close()

        self.assertTrue(
            {
                "customers",
                "transactions",
                "mcc_reference",
                "monthly_spend",
                "meta",
                "conversations",
                "messages",
                "schema_migrations",
            }.issubset(tables)
        )
        self.assertEqual([("0001_core.sql",), ("0002_chat.sql",)], migrations)


if __name__ == "__main__":
    unittest.main()
