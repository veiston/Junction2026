"""Spending patterns of one everyday habit, found from the customer's own transactions.

Exactly one pattern describes a habit. The order below decides which one wins, so the explanation the customer
reads always matches what their data shows. No model is involved.
"""
from __future__ import annotations

from dataclasses import dataclass

from services.chat.glossary import euros

SMALL_PURCHASE_CENTS = 1500   # on average at most EUR 15 per purchase counts as a small purchase
WEEKEND_SHARE_PERCENT = 60    # at least this share of the week's spending on Saturday and Sunday
RISE_PERCENT = 30             # this week is at least this much above the usual week


@dataclass(frozen=True)
class Pattern:
    id: str
    sentence: str


def detect(rows, week_cents: int, usual_week_cents: int) -> Pattern:
    """`rows`: the habit's purchases in the last 7 days; `usual_week_cents`: its average week before that."""
    count = len(rows)
    average = week_cents // count if count else 0
    if usual_week_cents > 0 and week_cents * 100 >= usual_week_cents * (100 + RISE_PERCENT):
        return Pattern("rising", f"That is up from about {euros(usual_week_cents)} in a usual week.")
    weekend = sum(-t.amount_cents for t in rows if t.date.weekday() >= 5)
    if count >= 2 and week_cents > 0 and weekend * 100 >= week_cents * WEEKEND_SHARE_PERCENT:
        return Pattern("weekend", "Most of it is spent on the weekend.")
    if count >= 3 and average <= SMALL_PURCHASE_CENTS:
        return Pattern("small_often", f"Many small purchases, about {euros(average)} each, that add up.")
    return Pattern("few_big", f"A few bigger purchases, about {euros(average)} each.")
