"""Process-wide demo clock (decision 0009). In memory; resets to DEMO_TODAY on restart."""

from __future__ import annotations

import threading
from datetime import date

from config import Config
from models.value_objects.period import DATA_START


class DemoClock:
    """Frozen 'today'. `set_today` rejects dates outside the dataset range [2024-10-01, dataset end]."""

    def __init__(self, today: date | None = None, max_date: date | None = None) -> None:
        self._lock = threading.Lock()
        self._max = max_date
        self._today = today or Config.from_env().demo_today

    def today(self) -> date:
        with self._lock:
            return self._today

    def set_today(self, value: date) -> None:
        # ValueError is mapped to ValidationFailed (400 VALIDATION_ERROR) by the controller.
        if value < DATA_START:
            raise ValueError(f"date is before {DATA_START}")
        if self._max is not None and value > self._max:
            raise ValueError(f"date is after the end of the data ({self._max})")
        with self._lock:
            self._today = value
