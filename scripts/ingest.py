"""Runs the full CSV-to-SQLite data import for this project."""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from models.database import Database
from services.ingest_service import ingest_dataset


if __name__ == "__main__":
    database = Database()
    database.path.unlink(missing_ok=True)
    database.path.with_suffix(".sqlite3-wal").unlink(missing_ok=True)
    database.path.with_suffix(".sqlite3-shm").unlink(missing_ok=True)
    ingest_dataset(database, Path(os.environ.get("DATA_DIR", ROOT / "Challenge data")))
    with database.session() as con:
        n = con.execute("SELECT count(*) FROM transactions").fetchone()[0]
    print(f"ingested {n} transactions into {database.path}")
