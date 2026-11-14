"""Same tests against the fakes and the SQLite repositories, plus migration checks."""

from __future__ import annotations

import shutil
import sqlite3
from datetime import date
from pathlib import Path

import pytest

from contracts.interfaces.repositories.habits import ChallengeRecord
from models.database import DEFAULT_MIGRATIONS_PATH, Database
from models.repositories.sqlite_habits_repo import SqliteChallengeRepository, SqliteLimitRepository
from tests.foundation._world import sqlite_world
from tests.habits.fakes import FakeChallengeRepository, FakeLimitRepository

ME, OTHER = "CUST00001", "CUST00002"
REAL_DB = Path(__file__).resolve().parents[3] / "db" / "money_coach.sqlite3"


@pytest.fixture(params=["fake", "sqlite"])
def repos(request, tmp_path):
    if request.param == "fake":
        return FakeLimitRepository(), FakeChallengeRepository()
    db = sqlite_world(tmp_path)[-1]
    return SqliteLimitRepository(db), SqliteChallengeRepository(db)


def _challenge(customer_id: str = ME, template_id: str = "zero_spend_taxis_14d") -> ChallengeRecord:
    return ChallengeRecord(0, customer_id, template_id, "No taxis", "taxis", "zero_spend", None, None,
                           date(2026, 9, 15), date(2026, 9, 29), "active")


def test_limit_create_and_read(repos):
    limits, _ = repos
    rec = limits.create(ME, "2026-09", 30000)
    assert rec.id and rec.basket == "everyday" and rec.status == "active"
    assert limits.get(ME, rec.id) == rec
    assert limits.active_for_month(ME, "2026-09") == rec
    assert limits.active_for_month(ME, "2026-08") is None


def test_other_customers_limit_is_none(repos):
    limits, _ = repos
    rec = limits.create(ME, "2026-09", 30000)
    assert limits.get(OTHER, rec.id) is None
    assert limits.active_for_month(OTHER, "2026-09") is None
    limits.set_status(OTHER, rec.id, "cancelled")
    assert limits.get(ME, rec.id).status == "active"


def test_limit_status_change_ends_active(repos):
    limits, _ = repos
    rec = limits.create(ME, "2026-09", 30000)
    limits.set_status(ME, rec.id, "completed")
    assert limits.get(ME, rec.id).status == "completed"
    assert limits.active_for_month(ME, "2026-09") is None


def test_challenges_newest_first_and_isolated(repos):
    _, challenges = repos
    a = challenges.create(_challenge())
    b = challenges.create(_challenge(template_id="max_amount_bars_30d"))
    challenges.create(_challenge(customer_id=OTHER))
    assert a.id != b.id and a.id > 0
    assert [c.id for c in challenges.list(ME)] == [b.id, a.id]
    assert challenges.list("CUST_NONE") == []
    assert challenges.active_with_template(OTHER, "max_amount_bars_30d") is None
    assert challenges.active_with_template(ME, "max_amount_bars_30d").id == b.id
    challenges.set_status(OTHER, b.id, "lost")
    assert challenges.active_with_template(ME, "max_amount_bars_30d") is not None
    challenges.set_status(ME, b.id, "won")
    assert challenges.active_with_template(ME, "max_amount_bars_30d") is None
    assert challenges.list(ME)[0].status == "won"
    assert challenges.list(ME)[1].start_date == date(2026, 9, 15)


def _tables(path) -> set[str]:
    con = sqlite3.connect(path)
    try:
        return {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    finally:
        con.close()


def test_migration_applies_on_fresh_db(tmp_path):
    db = Database(tmp_path / "fresh.sqlite3")
    db.migrate()
    db.migrate()
    assert {"spending_limits", "challenges"} <= _tables(db.path)


@pytest.mark.skipif(not REAL_DB.exists(), reason="db/money_coach.sqlite3 is not present")
def test_migration_applies_on_existing_db(tmp_path):
    copy = tmp_path / "copy.sqlite3"
    shutil.copy(REAL_DB, copy)
    con = sqlite3.connect(copy)
    con.executescript((DEFAULT_MIGRATIONS_PATH / "0003_habits.sql").read_text(encoding="utf-8"))
    con.close()
    assert {"spending_limits", "challenges", "transactions"} <= _tables(copy)
    # repositories also create the tables on their own when they are missing
    copy2 = tmp_path / "copy2.sqlite3"
    shutil.copy(REAL_DB, copy2)
    repo = SqliteLimitRepository(Database(copy2))
    assert repo.active_for_month(ME, "2026-09") is None
