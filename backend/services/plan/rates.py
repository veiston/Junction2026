"""Daily spending rates from the recent history (docs/er.md section 5.2)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from contracts.dto.common import Basket, Flow
from contracts.dto.transactions import Transaction
from services.plan.amounts import spent_cents
from services.plan.periods import DAYS_IN_YEAR

RATE_WINDOW_DAYS = 90
IRREGULAR_WINDOW_DAYS = DAYS_IN_YEAR


@dataclass(frozen=True)
class DailyRates:
    essentials_cents: int
    everyday_cents: int
    irregular_cents: int

    @property
    def total_cents(self) -> int:
        return self.essentials_cents + self.everyday_cents + self.irregular_cents


def daily_rates(rows: list[Transaction], today: date, bill_groups: set[str]) -> DailyRates:
    recent_from = today - timedelta(days=RATE_WINDOW_DAYS)
    irregular_from = today - timedelta(days=IRREGULAR_WINDOW_DAYS)
    essentials = _spent(rows, Basket.mandatory_regular, recent_from, bill_groups)
    everyday = _spent(rows, Basket.everyday, recent_from, bill_groups)
    irregular = _spent(rows, Basket.mandatory_irregular, irregular_from, bill_groups)
    return DailyRates(
        essentials_cents=essentials // RATE_WINDOW_DAYS,
        everyday_cents=everyday // RATE_WINDOW_DAYS,
        irregular_cents=irregular // IRREGULAR_WINDOW_DAYS,
    )


def _spent(rows: list[Transaction], basket: Basket, after: date, excluded_groups: set[str]) -> int:
    return sum(spent_cents(row) for row in rows if _counts(row, basket, after, excluded_groups))


def _counts(row: Transaction, basket: Basket, after: date, excluded_groups: set[str]) -> bool:
    if row.flow != Flow.spending:
        return False
    if row.basket != basket:
        return False
    if row.spend_group.value in excluded_groups:
        return False
    return row.date > after
