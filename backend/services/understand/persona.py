"""Spender persona: pure functions over a customer's rows (rules in docs/er.md §5.1).

Everything here is deterministic. The texts are written to be friendly and never judgmental:
none of them may contain a word from FORBIDDEN_WORDS (checked by the tests).
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

from contracts.dto.transactions import Transaction
from contracts.dto.understand import Key, Metrics, Persona, PersonaTrait

WINDOW_DAYS = 90
MIN_DATA_DAYS = 60
MICRO_LIMIT_CENTS = 1500           # rows under 15 EUR
PAYDAY_DAYS_AFTER = 3              # salary day itself + the 3 days after it
LATE_NIGHT_FROM, LATE_NIGHT_TO = 21, 5   # 21:00-04:59
WEEKEND_DAYS = (4, 5, 6)           # Fri, Sat, Sun (date.weekday())

POST_PAYDAY_MIN_PCT = 25.0
WEEKEND_MIN_PCT = 55.0
MICRO_MIN_ROWS_PER_MONTH = 40
STEADY_MAX_EVERYDAY_PCT = 25.0

FORBIDDEN_WORDS = ("bad", "irresponsible", "waste", "lazy", "careless", "failure")


@dataclass(frozen=True)
class PersonaResult:
    persona: Persona
    title: str
    description: str
    traits: list[PersonaTrait]
    metrics: Metrics
    tips: list[str]
    everyday_tx_count: int


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole > 0 else 0.0


def _eur(cents: int) -> str:
    return f"{round(cents / 100):,} €".replace(",", " ")


def _spent(tx: Transaction) -> int:
    """Positive = money spent."""
    return -tx.amount_cents


def _is_everyday(tx: Transaction) -> bool:
    return tx.flow.value == "spending" and tx.basket is not None and tx.basket.value == "everyday"


def _after_payday(day: date, salary_days: list[date]) -> bool:
    return any(0 <= (day - s).days <= PAYDAY_DAYS_AFTER for s in salary_days)


def compute_metrics(
    rows: Iterable[Transaction], salary_days: list[date], months: float
) -> tuple[Metrics, int, int]:
    """Returns (metrics, micro rows per month, everyday row count) for the rows of the window."""
    rows = list(rows)
    spending = [t for t in rows if t.flow.value == "spending"]
    everyday = [t for t in spending if _is_everyday(t)]
    total_spent = sum(_spent(t) for t in spending)
    everyday_spent = sum(_spent(t) for t in everyday)

    weekend = sum(_spent(t) for t in everyday if t.date.weekday() in WEEKEND_DAYS)
    late = sum(
        _spent(t) for t in everyday
        if t.timestamp.hour >= LATE_NIGHT_FROM or t.timestamp.hour < LATE_NIGHT_TO
    )
    post_payday = sum(_spent(t) for t in everyday if _after_payday(t.date, salary_days))
    micro = [t for t in everyday if 0 < _spent(t) < MICRO_LIMIT_CENTS]
    months = max(months, 1.0)

    metrics = Metrics(
        weekend_share_pct=_pct(weekend, everyday_spent),
        late_night_share_pct=_pct(late, everyday_spent),
        post_payday_share_pct=_pct(post_payday, everyday_spent),
        micro_spend_monthly_cents=round(sum(_spent(t) for t in micro) / months),
        everyday_share_pct=_pct(everyday_spent, total_spent),
    )
    return metrics, round(len(micro) / months), len(everyday)


def choose_persona(metrics: Metrics, micro_rows_per_month: int, data_days: int) -> Persona:
    """First match wins (docs/er.md §5.1)."""
    if data_days < MIN_DATA_DAYS:
        return Persona.balanced
    if metrics.post_payday_share_pct >= POST_PAYDAY_MIN_PCT:
        return Persona.payday_splurger
    if metrics.weekend_share_pct >= WEEKEND_MIN_PCT:
        return Persona.weekend_socialiser
    if micro_rows_per_month >= MICRO_MIN_ROWS_PER_MONTH:
        return Persona.small_leaks
    if metrics.everyday_share_pct <= STEADY_MAX_EVERYDAY_PCT:
        return Persona.steady_planner
    return Persona.balanced


_TEXTS: dict[Persona, tuple[str, str]] = {
    Persona.payday_splurger: (
        "The Payday Celebrator",
        "A good part of your everyday spending happens in the first days after payday. "
        "That is very common: the account feels full, so treats come easily.",
    ),
    Persona.weekend_socialiser: (
        "The Weekend Socialiser",
        "Most of your everyday spending happens from Friday to Sunday. "
        "Your weekdays are calm and your weekends are where life happens.",
    ),
    Persona.small_leaks: (
        "The Little-and-Often Spender",
        "You make many small everyday purchases. Each one is tiny, "
        "but together they add up to a noticeable monthly amount.",
    ),
    Persona.steady_planner: (
        "The Steady Planner",
        "Only a small share of your spending is everyday spending. "
        "Most of your money goes to planned, necessary costs.",
    ),
    Persona.balanced: (
        "The Balanced Spender",
        "Your everyday spending is spread evenly across the week and the month, "
        "without one strong pattern.",
    ),
}


def _traits(m: Metrics, micro_rows: int) -> list[PersonaTrait]:
    return [
        PersonaTrait(
            key=Key.weekend_share, label="Weekend spending",
            value_text=f"{m.weekend_share_pct:g} % of everyday spending happens Fri-Sun",
            evidence="Fri-Sun is 3 of 7 days (about 43 %), so a higher share means the weekend carries more.",
        ),
        PersonaTrait(
            key=Key.late_night_share, label="Late-night spending",
            value_text=f"{m.late_night_share_pct:g} % of everyday spending happens 21:00-04:59",
            evidence="Counted from the time of each everyday purchase.",
        ),
        PersonaTrait(
            key=Key.post_payday_share, label="Right after payday",
            value_text=f"{m.post_payday_share_pct:g} % of everyday spending happens within 3 days after salary",
            evidence="Payday and the 3 days after it are about 13 % of a month.",
        ),
        PersonaTrait(
            key=Key.micro_spend, label="Small purchases",
            value_text=f"{_eur(m.micro_spend_monthly_cents)} a month in purchases under 15 € ({micro_rows} a month)",
            evidence="Everyday purchases under 15 €, averaged over the last 3 months.",
        ),
        PersonaTrait(
            key=Key.everyday_share, label="Everyday share",
            value_text=f"{m.everyday_share_pct:g} % of all spending is everyday spending",
            evidence="Everyday basket compared with all three baskets together.",
        ),
    ]


def _tips(persona: Persona, m: Metrics) -> list[str]:
    micro_year = m.micro_spend_monthly_cents * 12
    tips = {
        Persona.payday_splurger: [
            "Move a fixed amount to savings on payday, before the treats start.",
            "Plan one payday treat in advance so it feels earned, not automatic.",
        ],
        Persona.weekend_socialiser: [
            "Set a weekend budget on Friday morning and check it on Sunday.",
            "Alternate one paid outing with one free plan each weekend.",
        ],
        Persona.small_leaks: [
            f"Your small purchases add up to about {_eur(micro_year)} a year. Halving them keeps {_eur(micro_year // 2)}.",
            "Try a 'no small buys' day once a week and see how it feels.",
        ],
        Persona.steady_planner: [
            "Your fixed costs carry most of the load: check once a year that rent, energy and insurance are still good deals.",
            "Your everyday budget has room, so a small monthly savings transfer is easy to start.",
        ],
        Persona.balanced: [
            "Pick one everyday group and follow it for a month to learn where it goes.",
            "A small automatic savings transfer on payday builds a buffer without effort.",
        ],
    }[persona]
    if persona is not Persona.small_leaks and m.micro_spend_monthly_cents > 0:
        tips.append(f"Small purchases under 15 € add up to about {_eur(micro_year)} a year.")
    return tips[:3]


def build_persona(rows: Iterable[Transaction], salary_days: list[date], months: float, data_days: int) -> PersonaResult:
    metrics, micro_rows, everyday_count = compute_metrics(rows, salary_days, months)
    persona = choose_persona(metrics, micro_rows, data_days)
    title, description = _TEXTS[persona]
    return PersonaResult(
        persona=persona, title=title, description=description, traits=_traits(metrics, micro_rows),
        metrics=metrics, tips=_tips(persona, metrics), everyday_tx_count=everyday_count,
    )
