"""Notices behind the bell (rules in docs/decisions/0020). Deterministic; the LLM never writes them.

Each call to `unread` looks at the customer's data for the demo 'today', records any new notice once
(stable ids, so the same event never shows twice) and returns what is still unread.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from contracts.dto.notifications import Notification, NotificationList
from contracts.interfaces.controllers.errors import NotFound
from contracts.interfaces.repositories.shared import Clock, TransactionRepository

WEEK_DAYS = 7
CHANGE_MIN_PCT = 25          # everyday spending must move at least this much week on week...
CHANGE_MIN_CENTS = 2000      # ...and at least 20 EUR, so small amounts never trigger a notice
SUGGEST_EVERY_DAYS = 14      # an invitation to try a challenge, at most once every two weeks
MAX_ITEMS = 10

GROUP_LABELS = {  # the most common everyday groups; anything else is shown with its id made readable
    "restaurants": "restaurants", "bars": "bars", "fast_food_cafes": "fast food and cafés", "taxis": "taxis",
    "kiosks": "kiosks", "clothing": "clothes", "cinemas": "cinemas", "events_tickets": "events",
    "flights": "flights", "hotels": "hotels", "other_retail": "other shops", "software_apps": "apps",
}


def _eur(cents: int) -> str:
    return f"{round(cents / 100):,} €".replace(",", " ")


def _group(spend_group: str) -> str:
    return GROUP_LABELS.get(spend_group, spend_group.replace("_", " "))


class NotificationServiceImpl:
    def __init__(self, transactions: TransactionRepository, habits, repository, clock: Clock) -> None:
        """`habits` is the HabitsService (challenges); `repository` the SqliteNotificationRepository."""
        self._tx = transactions
        self._habits = habits
        self._repo = repository
        self._clock = clock

    # ------------------------------------------------------------------ public
    def unread(self, customer_id: str) -> NotificationList:
        today = self._clock.today()
        challenges = self._habits.list_challenges(customer_id).items
        running = next((c.challenge for c in challenges if c.challenge.status.value == "active"), None)

        for notice in (
            self._spending_change(customer_id, today, running),
            self._challenge_ended(challenges, today),
            None if running else self._challenge_suggestion(customer_id, today),
        ):
            if notice is not None:
                self._repo.add(customer_id, notice)

        # A notice dated after the demo 'today' (the clock was moved back) is not shown yet.
        items = [n for n in self._repo.unread(customer_id) if n.created_date <= today]
        return NotificationList(items=items[:MAX_ITEMS], unread_count=len(items))

    def mark_read(self, customer_id: str, notification_id: str) -> None:
        if not self._repo.mark_read(customer_id, notification_id, self._clock.today()):
            raise NotFound("Notification not found.")

    # ------------------------------------------------------------------ rules
    def _everyday_by_group(self, customer_id: str, start: date, end: date) -> dict[str, int]:
        out: dict[str, int] = defaultdict(int)
        for t in self._tx.all_between(customer_id, start, end):
            if t.flow.value == "spending" and t.basket is not None and t.basket.value == "everyday":
                out[t.spend_group.value] += -t.amount_cents
        return out

    def _spending_change(self, customer_id: str, today: date, running) -> Notification | None:
        """Everyday spending of the last 7 days vs the 7 days before."""
        this_start = today - timedelta(days=WEEK_DAYS - 1)
        prev_end = this_start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=WEEK_DAYS - 1)
        now = self._everyday_by_group(customer_id, this_start, today)
        before = self._everyday_by_group(customer_id, prev_start, prev_end)
        now_total, before_total = sum(now.values()), sum(before.values())
        diff = now_total - before_total
        if before_total <= 0 or abs(diff) < CHANGE_MIN_CENTS or abs(diff) * 100 < CHANGE_MIN_PCT * before_total:
            return None

        pct = round(abs(diff) / before_total * 100)
        groups = set(now) | set(before)
        mover = max(groups, key=lambda g: (abs(now.get(g, 0) - before.get(g, 0)), g))
        mover_diff = now.get(mover, 0) - before.get(mover, 0)
        up = diff > 0
        year, week, _ = today.isocalendar()
        challenge = f" Your challenge \"{running.title}\" is running, so now is a good moment to check it." if running else ""

        if up:
            title = "Everyday spending is up this week"
            text = (f"You spent {_eur(now_total)} on everyday things in the last 7 days, {pct} % more than the "
                    f"week before. Most of the rise came from {_group(mover)} (+{_eur(mover_diff)}).{challenge}")
            ask = ("My everyday spending went up this week. What changed, and what can I do to stay on track"
                   + (" with my challenge?" if running else "?"))
        else:
            title = "Nice: everyday spending is down this week"
            text = (f"You spent {_eur(now_total)} on everyday things in the last 7 days, {pct} % less than the "
                    f"week before, mostly on {_group(mover)} ({_eur(mover_diff)}).{challenge}")
            ask = "My everyday spending went down this week. What changed, and how do I keep it up?"
        return Notification(
            id=f"spending-{year}-w{week:02d}", kind="spending_change", tone="warning" if up else "good",
            title=title, text=text, ask=ask, created_date=today,
        )

    @staticmethod
    def _challenge_ended(challenges, today: date) -> Notification | None:
        finished = [c.challenge for c in challenges if c.challenge.status.value in ("won", "lost")]
        if not finished:
            return None
        latest = max(finished, key=lambda c: c.id)
        won = latest.status.value == "won"
        return Notification(
            id=f"challenge-{latest.id}", kind="challenge_ended", tone="good" if won else "info",
            title="Your challenge has ended",
            text=f"\"{latest.title}\" is over. {'You reached the goal!' if won else 'See how the week went.'}",
            ask="How did my challenge go?", created_date=min(latest.end_date, today),
        )

    def _challenge_suggestion(self, customer_id: str, today: date) -> Notification | None:
        last = self._repo.last_created(customer_id, "challenge_suggestion")
        if last is not None and (today - last).days < SUGGEST_EVERY_DAYS and last <= today:
            return None
        items = self._habits.challenge_suggestions(customer_id).items
        if not items:
            return None
        top = items[0]
        return Notification(
            id=f"suggest-{today.isoformat()}", kind="challenge_suggestion", tone="info",
            title="Ready for a small challenge?",
            text=(f"Try \"{top.title}\". It could free about {_eur(top.estimated_saving_cents)}, "
                  "and nothing is blocked: it only counts your spending."),
            ask="Suggest a challenge for me", created_date=today,
        )
