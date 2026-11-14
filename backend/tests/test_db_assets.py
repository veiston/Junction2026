"""`backend/db/` is a copy of the files the server needs when only `backend/` is deployed (for example on Railway)."""
from __future__ import annotations

from pathlib import Path

import models.database as database

ROOT_DB = database.PROJECT_ROOT / "db"
COPY = database.BACKEND_DIR / "db"


def test_the_copies_match_the_originals():
    originals = sorted(ROOT_DB.glob("migrations/*.sql")) + [ROOT_DB / "seed" / "statfin_household_spending.json"]
    assert originals
    for original in originals:
        copy = COPY / original.relative_to(ROOT_DB)
        assert copy.read_bytes() == original.read_bytes(), f"{copy} differs from {original}: copy it again"


def test_without_a_db_folder_at_the_root_the_copy_inside_backend_is_used(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "PROJECT_ROOT", tmp_path)
    assert database.db_dir() == COPY and (database.db_dir() / "migrations" / "0003_habits.sql").is_file()


def test_with_a_db_folder_at_the_root_that_one_is_used():
    assert database.db_dir() == ROOT_DB
