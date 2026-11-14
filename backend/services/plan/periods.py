"""Shared constants and calendar helpers of the plan slice."""
from __future__ import annotations

import calendar
from datetime import date, timedelta

DAYS_IN_WEEK = 7
MONTHS_IN_YEAR = 12
DAYS_IN_YEAR = 365
FULL_MONTHS = 3
MONTH_KEY_FORMAT = "%Y-%m"


def month_key(day: date) -> str:
    return day.strftime(MONTH_KEY_FORMAT)


def first_of_month(day: date, months_ahead: int = 0) -> date:
    index = day.year * MONTHS_IN_YEAR + day.month - 1 + months_ahead
    return date(index // MONTHS_IN_YEAR, index % MONTHS_IN_YEAR + 1, 1)


def full_month_keys(today: date) -> list[str]:
    """The FULL_MONTHS calendar months before the month of today, oldest first."""
    return [month_key(first_of_month(today, -offset)) for offset in range(FULL_MONTHS, 0, -1)]


def date_in_month(first_day: date, day_of_month: int) -> date:
    last_day = calendar.monthrange(first_day.year, first_day.month)[1]
    return first_day.replace(day=min(day_of_month, last_day))


def date_after(day_of_month: int, after: date) -> date:
    """First date strictly after `after` that falls on `day_of_month` (clamped to the month length)."""
    this_month = date_in_month(first_of_month(after), day_of_month)
    if this_month > after:
        return this_month
    return date_in_month(first_of_month(after, 1), day_of_month)


def monthly_dates(day_of_month: int, today: date, end: date) -> list[date]:
    """Every monthly occurrence with today < date <= end."""
    dates = []
    current = date_after(day_of_month, today)
    while current <= end:
        dates.append(current)
        current = date_after(day_of_month, current)
    return dates


def days_ahead(today: date, days: int) -> date:
    return today + timedelta(days=days)
