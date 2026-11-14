"""The notice rules on in-memory fakes: thresholds, tone, the running challenge, and how rarely suggestions come."""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace

import pytest

from contracts.dto.transactions import Transaction
from services.notifications.service import NotificationServiceImpl
from tests.fakes.clock import FakeClock
from tests.fakes.repositories import FakeTransactionRepository

CID = "CUST00001"
TODAY = date(2026, 9, 15)


def spend(i, day, cents, group="restaurants"):
    return Transaction(
        id=i, date=day, timestamp=f"{day}T12:00:00+00:00", category="Restaurants", spend_group=group,
        label="Restaurants", amount_cents=-cents, balance_after_cents=0, flow="spending", basket="everyday",
        merchant_id=None, mcc=None,
    )


BASELINE_DAYS = ("2026-08-14", "2026-08-21", "2026-08-28", "2026-09-04")  # one in each of the 4 weeks before


def week(typical_cents, now_cents, group_now="restaurants"):
    """`typical_cents` in each of the 4 baseline weeks, `now_cents` in the last 7 days (12 Sep)."""
    rows = [spend(i, d, typical_cents) for i, d in enumerate(BASELINE_DAYS, start=1)]
    rows.append(spend(9, "2026-09-12", now_cents, group_now))
    return [r for r in rows if r.amount_cents != 0]


class MemoryRepo:
    def __init__(self):
        self.rows = {}  # id -> [notice, read]

    def add(self, cid, notice):
        self.rows.setdefault(notice.id, [notice, False])

    def unread(self, cid):
        return sorted((n for n, read in self.rows.values() if not read), key=lambda n: (n.created_date, n.id),
                      reverse=True)

    def last_created(self, cid, kind):
        dates = [n.created_date for n, _ in self.rows.values() if n.kind.value == kind]
        return max(dates) if dates else None

    def mark_read(self, cid, nid, today):
        if nid not in self.rows:
            return False
        self.rows[nid][1] = True
        return True


class Habits:
    def __init__(self, running=None, finished=None, suggestion=True):
        self.items = []
        if running:
            self.items.append(self._item(1, running, "active"))
        if finished:
            self.items.append(self._item(2, finished[0], finished[1]))
        self.suggestion = suggestion

    @staticmethod
    def _item(cid, title, status):
        ch = SimpleNamespace(id=cid, title=title, status=SimpleNamespace(value=status), end_date=TODAY)
        return SimpleNamespace(challenge=ch)

    def list_challenges(self, customer_id):
        return SimpleNamespace(items=self.items)

    def challenge_suggestions(self, customer_id):
        top = SimpleNamespace(title="A week without taxis", estimated_saving_cents=4200)
        return SimpleNamespace(items=[top] if self.suggestion else [])


def service(rows, habits=None, today=TODAY):
    clock = FakeClock(today)
    repo = MemoryRepo()
    svc = NotificationServiceImpl(FakeTransactionRepository(clock, {CID: rows}), habits or Habits(), repo, clock)
    return svc, clock, repo


def kinds(svc):
    return {n.kind.value: n for n in svc.unread(CID).items}


@pytest.mark.parametrize("typical,now,expect", [
    (3000, 7500, "warning"),   # +150 %, +45 EUR vs a typical week
    (10000, 5000, "good"),     # -50 %, -50 EUR
    (3000, 4000, None),        # +33 %: below 50 %
    (1000, 3000, None),        # +200 % but only +20 EUR: below 40 EUR
    (0, 9000, None),           # no history: no fair comparison
    (5000, 0, None),           # nothing recorded this week: more likely missing data than a change
])
def test_spending_change_thresholds_and_tone(typical, now, expect):
    notice = kinds(service(week(typical, now))[0]).get("spending_change")
    assert (notice.tone.value if notice else None) == expect


def test_texts_compare_with_a_typical_week():
    up = kinds(service(week(3000, 7500))[0])["spending_change"].text
    assert "75 €" in up and "150 % more than in a typical week (30 €)" in up and "restaurants (+45 €)" in up
    down = kinds(service(week(10000, 5000))[0])["spending_change"].text
    assert "50 % less than in a typical week (100 €)" in down and "biggest drop was in restaurants (−50 €)" in down


def test_a_running_challenge_is_named_and_suggestions_pause():
    svc, _, _ = service(week(3000, 7500), Habits(running="No taxis for a week"))
    found = kinds(svc)
    assert 'Your challenge "No taxis for a week" is running' in found["spending_change"].text
    assert found["spending_change"].ask.endswith("stay on track with my challenge?")
    assert "challenge_suggestion" not in found


def test_a_finished_challenge_is_a_notice():
    svc, _, _ = service([], Habits(finished=("No taxis for a week", "won")))
    notice = kinds(svc)["challenge_ended"]
    assert notice.id == "challenge-2" and notice.tone.value == "good" and "You reached the goal" in notice.text


def test_suggestions_at_most_every_14_days():
    svc, clock, _ = service([])
    first = kinds(svc)["challenge_suggestion"]
    svc.mark_read(CID, first.id)
    for days, expected in ((1, False), (13, False), (14, True)):
        clock.set_today(TODAY + timedelta(days=days))
        assert ("challenge_suggestion" in kinds(svc)) is expected, days


def test_texts_never_blame():
    svc, _, _ = service(week(3000, 7500))
    for n in svc.unread(CID).items:
        words = set((n.title + " " + n.text).lower().replace(".", " ").split())
        assert not words & {"bad", "irresponsible", "waste", "lazy", "careless", "failure"}


def test_unknown_notice_is_not_found():
    from contracts.interfaces.controllers.errors import NotFound

    svc, _, _ = service([])
    with pytest.raises(NotFound):
        svc.mark_read(CID, "nope")
