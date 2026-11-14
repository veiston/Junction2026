"""Builds UnderstandServiceImpl from config, inside slice-owned files only (decision 0010).

The foundation container does not know about this slice, so the controller and the AI tools
build the service here. Both pass the demo 'today' they already have (the session clock for
REST, ToolContext.today for tools), so moving the demo clock moves this slice too.
"""

from __future__ import annotations

from datetime import date
from functools import lru_cache
from pathlib import Path

from config import Config
from models.database import PROJECT_ROOT, Database
from models.repositories.open_data_repo import JsonOpenDataRepository
from models.repositories.sqlite_customer_repo import SqliteCustomerRepository
from models.repositories.sqlite_monthly_spend_repo import SqliteMonthlySpendRepository
from models.repositories.sqlite_transaction_repo import SqliteTransactionRepository
from services.understand.service import UnderstandServiceImpl


class FixedClock:
    """Read-only clock for one request: the slice never moves the demo clock."""

    def __init__(self, today: date) -> None:
        self._today = today

    def today(self) -> date:
        return self._today

    def set_today(self, value: date) -> None:  # pragma: no cover - never called by this slice
        raise RuntimeError("The understand slice does not move the demo clock.")


def _db_path(config: Config) -> Path:
    path = Path(config.db_path)
    return path if path.is_absolute() else PROJECT_ROOT / path


@lru_cache(maxsize=4)
def _database(path: Path) -> Database:
    return Database(path)


@lru_cache(maxsize=1)
def _open_data() -> JsonOpenDataRepository:
    return JsonOpenDataRepository()


def build_service(config: Config, today: date) -> UnderstandServiceImpl:
    db = _database(_db_path(config))
    clock = FixedClock(today)
    return UnderstandServiceImpl(
        SqliteTransactionRepository(db, clock),
        SqliteMonthlySpendRepository(db, clock),
        SqliteCustomerRepository(db),
        clock,
        open_data=_open_data(),
    )


# The AI tools have no request, so they read the config from the environment (main.py loads
# .env before the app starts). Tests point them at their own database with configure_tools().
_tool_config: Config | None = None


def configure_tools(config: Config | None) -> None:
    global _tool_config
    _tool_config = config


def tool_service(today: date) -> UnderstandServiceImpl:
    return build_service(_tool_config or Config.from_env(), today)
