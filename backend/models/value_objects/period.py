"""Inclusive date range. from_date <= to_date <= today, from_date >= 2024-10-01."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

DATA_START = date(2024, 10, 1)


@dataclass(frozen=True)
class Period:
    from_date: date
    to_date: date

    def __post_init__(self) -> None:
        if self.from_date > self.to_date:
            raise ValueError("from_date must be on or before to_date")

    @classmethod
    def checked(cls, from_date: date, to_date: date, today: date) -> Period:
        """Validate against the demo clock and the dataset start."""
        if to_date > today:
            raise ValueError("to_date is after today")
        if from_date < DATA_START:
            raise ValueError(f"from_date is before {DATA_START}")
        return cls(from_date, to_date)

    def contains(self, day: date) -> bool:
        return self.from_date <= day <= self.to_date

    @property
    def days(self) -> int:
        return (self.to_date - self.from_date).days + 1
