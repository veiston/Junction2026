"""Monthly everyday-spending limit logic: suggestion, progress and review."""
from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date, timedelta

from contracts.dto.common import GroupAmount, Period, Source
from contracts.dto.habits import (
    CumulativePoint,
    LimitProgress,
    LimitReview,
    LimitSuggestion,
    MonthAmount,
    SpendingLimit,
)
from contracts.dto.transactions import Transaction
from contracts.interfaces.repositories.habits import LimitRecord
from services.session_service import DATA_FROM

HISTORY_MONTHS = 3
STEP_CENTS = 1000
MIN_LIMIT_CENTS = 1000
MAX_LIMIT_CENTS = 1000000
SOURCE_TEXT = "Calculated from your transactions"


def month_key(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def month_start(month: str) -> date:
    return date(int(month[:4]), int(month[5:7]), 1)


def month_end(month: str) -> date:
    start = month_start(month)
    return start.replace(day=calendar.monthrange(start.year, start.month)[1])


def previous_month_start(day: date) -> date:
    return (day.replace(day=1) - timedelta(days=1)).replace(day=1)


def everyday_rows(rows: list[Transaction]) -> list[Transaction]:
    return [t for t in rows if t.flow.value == "spending" and t.basket is not None and t.basket.value == "everyday"]


def spent(rows: list[Transaction]) -> int:
    return -sum(t.amount_cents for t in rows)


def group_totals(rows: list[Transaction]) -> list[GroupAmount]:
    """Spending per spend group, largest first (ties by group name)."""
    amounts: dict[str, int] = defaultdict(int)
    counts: dict[str, int] = defaultdict(int)
    labels: dict[str, str] = {}
    for t in rows:
        key = t.spend_group.value
        amounts[key] += -t.amount_cents
        counts[key] += 1
        labels.setdefault(key, t.label)
    ordered = sorted(amounts, key=lambda g: (-amounts[g], g))
    return [GroupAmount(spend_group=g, label=labels[g], amount_cents=amounts[g], tx_count=counts[g])
            for g in ordered]


def source_for(from_date: date, to_date: date, tx_count: int) -> Source:
    return Source(description=SOURCE_TEXT, period=Period(from_date=from_date, to_date=to_date), tx_count=tx_count)


def _floor_to_step(cents: int) -> int:
    return cents // STEP_CENTS * STEP_CENTS


class LimitCalculator:
    def __init__(self, transactions) -> None:
        self._tx = transactions

    def _month_rows(self, customer_id: str, month: str, today: date) -> list[Transaction]:
        return everyday_rows(self._tx.all_between(customer_id, month_start(month), min(month_end(month), today)))

    # -------------------------------------------------------------- suggestion
    def suggestion(self, customer_id: str, today: date) -> LimitSuggestion:
        starts: list[date] = []
        cursor = today.replace(day=1)
        for _ in range(HISTORY_MONTHS):
            cursor = previous_month_start(cursor)
            if cursor >= DATA_FROM:
                starts.append(cursor)
        starts.reverse()  # oldest first
        history: list[MonthAmount] = []
        tx_count = 0
        for start in starts:
            rows = self._month_rows(customer_id, month_key(start), today)
            tx_count += len(rows)
            history.append(MonthAmount(month=month_key(start), amount_cents=spent(rows)))
        avg = sum(h.amount_cents for h in history) // len(history) if history else 0

        min_c = max(MIN_LIMIT_CENTS, _floor_to_step(avg // 2))
        max_c = min(MAX_LIMIT_CENTS, max(min_c + STEP_CENTS, _floor_to_step(avg * 12 // 10)))
        suggested = min(max_c, max(min_c, _floor_to_step(avg * 9 // 10)))
        if history:
            rationale = (
                f"Your everyday spending averaged {avg / 100:.0f} EUR over the last {len(history)} full months. "
                f"A limit of {suggested / 100:.0f} EUR is a realistic target about 10% below that."
            )
            period = (month_start(history[0].month), month_end(history[-1].month))
        else:
            rationale = "There is not enough history yet, so this is a starting point you can adjust."
            period = (today.replace(day=1), today)
        return LimitSuggestion(
            month=month_key(today), basket="everyday", suggested_cents=suggested, min_cents=min_c,
            max_cents=max_c, step_cents=STEP_CENTS, history=history,
            expected_saving_cents=avg - suggested, rationale=rationale,
            source=source_for(period[0], period[1], tx_count),
        )

    # ---------------------------------------------------------------- progress
    def progress(self, record: LimitRecord, today: date) -> LimitProgress:
        start = month_start(record.month)
        end = min(month_end(record.month), today)
        rows = self._month_rows(record.customer_id, record.month, today)
        total = spent(rows)
        days_in_month = calendar.monthrange(start.year, start.month)[1]
        days_elapsed = max(0, (end - start).days + 1) if end >= start else 0
        on_pace = record.amount_cents * days_elapsed // days_in_month
        if total > record.amount_cents:
            status = "over"
        elif total > on_pace * 1.1:
            status = "at_risk"
        else:
            status = "on_track"
        per_day: dict[date, int] = defaultdict(int)
        for t in rows:
            per_day[t.date] += -t.amount_cents
        daily, running = [], 0
        for i in range(days_elapsed):
            day = start + timedelta(days=i)
            running += per_day.get(day, 0)
            daily.append(CumulativePoint(date=day, cumulative_cents=running))
        return LimitProgress(
            limit=to_limit_dto(record), spent_cents=total, remaining_cents=record.amount_cents - total,
            days_elapsed=days_elapsed, days_in_month=days_in_month, on_pace_cents=on_pace, status=status,
            daily=daily, top_groups=group_totals(rows)[:3], source=source_for(start, max(start, end), len(rows)),
        )

    # ------------------------------------------------------------------ review
    def review(self, record: LimitRecord, today: date) -> LimitReview:
        start = month_start(record.month)
        end = max(start, min(month_end(record.month), today))
        rows = self._month_rows(record.customer_id, record.month, today)
        total = spent(rows)
        prev = month_key(previous_month_start(start))
        prev_total = spent(self._month_rows(record.customer_id, prev, today)) if previous_month_start(start) >= DATA_FROM else 0
        groups = group_totals(rows)
        return LimitReview(
            limit=to_limit_dto(record), final_spent_cents=total, difference_cents=record.amount_cents - total,
            met=total <= record.amount_cents, previous_month_cents=prev_total,
            biggest_leak=groups[0] if groups else None, best_week_start=_best_week(rows, start, end),
            source=source_for(start, end, len(rows)),
        )


def _best_week(rows: list[Transaction], start: date, end: date) -> date | None:
    """First day of the 7-day window with the lowest everyday spend (earliest on ties)."""
    days = (end - start).days + 1
    if days < 7:
        return None
    per_day: dict[date, int] = defaultdict(int)
    for t in rows:
        per_day[t.date] += -t.amount_cents
    best_day, best_total = None, None
    for i in range(days - 6):
        first = start + timedelta(days=i)
        total = sum(per_day.get(first + timedelta(days=k), 0) for k in range(7))
        if best_total is None or total < best_total:
            best_day, best_total = first, total
    return best_day


def to_limit_dto(record: LimitRecord) -> SpendingLimit:
    return SpendingLimit(id=record.id, month=record.month, basket="everyday", amount_cents=record.amount_cents,
                         status=record.status, created_at=record.created_at)
