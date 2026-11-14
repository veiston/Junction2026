"""YYYY-MM month value."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

_PATTERN = re.compile(r"^([0-9]{4})-(0[1-9]|1[0-2])$")


@dataclass(frozen=True, order=True)
class YearMonth:
    year: int
    month: int

    @classmethod
    def parse(cls, text: str) -> YearMonth:
        match = _PATTERN.match(text)
        if not match:
            raise ValueError(f"invalid YearMonth: {text!r}")
        return cls(int(match.group(1)), int(match.group(2)))

    @classmethod
    def of(cls, day: date) -> YearMonth:
        return cls(day.year, day.month)

    def __str__(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"

    def first_day(self) -> date:
        return date(self.year, self.month, 1)

    def next(self) -> YearMonth:
        return YearMonth(self.year + 1, 1) if self.month == 12 else YearMonth(self.year, self.month + 1)

    def last_day(self) -> date:
        from datetime import timedelta

        return self.next().first_day() - timedelta(days=1)
