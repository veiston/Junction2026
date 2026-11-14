"""Fake Clock frozen to DEMO_TODAY (default 2026-09-15)."""

from __future__ import annotations

from datetime import date

from config import Config


class FakeClock:
    def __init__(self, today: date | None = None) -> None:
        self._today = today or Config.from_env({}).demo_today

    def today(self) -> date:
        return self._today

    def set_today(self, value: date) -> None:
        self._today = value
