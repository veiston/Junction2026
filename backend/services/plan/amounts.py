"""Small money helpers of the plan slice. Money is integer euro cents."""
from __future__ import annotations

import statistics

from contracts.dto.transactions import Transaction


def median_cents(values: list[int]) -> int:
    return round(statistics.median(values))


def spent_cents(row: Transaction) -> int:
    return -row.amount_cents
