"""7-day experiments: habit finding, start, progress and settlement, on small hand-made transaction sets."""
from __future__ import annotations

from datetime import date

import pytest

from contracts.dto.habits import StartChallengeRequest
from contracts.interfaces.controllers.errors import Conflict, NotFound
from services.habits.service import HabitsServiceImpl
from tests.fakes import FakeClock, FakeTransactionRepository
from tests.habits.fakes import FakeChallengeRepository, FakeLimitRepository
from tests.habits.world import ME, OTHER, tx

TODAY = date(2026, 9, 15)
TAXI_ID = "max_amount_taxis_7d"

TAXIS = [("2026-08-20", 3000), ("2026-09-08", 3000), ("2026-09-10", 3500), ("2026-09-12", 3426)]  # baseline 9926 / 3
CAFES = [("2026-08-25", 400), ("2026-09-01", 400), ("2026-09-09", 450)]


def rows(group: str, items, basket="everyday", start_id=1):
    return [tx(start_id + i, d, group, c, basket) for i, (d, c) in enumerate(items)]


def build(mine, today=TODAY, other=()):
    clock = FakeClock(today)
    repo = FakeTransactionRepository(clock, {ME: list(mine), OTHER: list(other)})
    challenges = FakeChallengeRepository()
    return HabitsServiceImpl(FakeLimitRepository(), challenges, repo, clock), clock, challenges


def ids(svc):
    return [t.id for t in svc.challenge_suggestions(ME).items]


def test_qualifying_group_becomes_a_one_week_experiment():
    svc, *_ = build(rows("taxis", TAXIS))
    (t,) = svc.challenge_suggestions(ME).items
    assert t.id == TAXI_ID and int(t.duration_days) == 7 and t.rule.kind.value == "max_amount"
    assert t.baseline_cents == 9926 and t.baseline_count == 3
    assert t.rule.amount_cents == 4900  # half of 99.26, rounded down to whole euros
    assert t.estimated_saving_cents == 9926 - 4900 and t.yearly_saving_cents == (9926 - 4900) * 52
    assert "3 purchases" in t.reason and "EUR 99.26" in t.reason and "7 days" in t.reason
    assert t.concept.id.value == "compare_equal_periods"


def test_groups_that_do_not_qualify_are_left_out():
    mine = [
        *rows("taxis", TAXIS, start_id=1),
        *rows("bars", [("2026-08-20", 5000), ("2026-08-25", 5000), ("2026-09-01", 5000)], start_id=10),  # none in baseline week
        *rows("cinemas", [("2026-09-09", 900), ("2026-09-10", 900)], start_id=20),  # only 2 purchases
        *rows("supermarkets", [("2026-09-09", 900)] * 4, basket="mandatory_regular", start_id=30),  # not everyday
        *rows("fast_food_cafes", [("2026-09-15", 400)] * 3 + [("2026-09-09", 400)], start_id=40),  # today does not count
    ]
    svc, *_ = build(mine)
    assert ids(svc) == [TAXI_ID]


def test_up_to_three_ordered_by_28_day_spend():
    mine = [
        *rows("fast_food_cafes", CAFES, start_id=1),
        *rows("taxis", TAXIS, start_id=10),
        *rows("bars", [("2026-09-01", 2000), ("2026-09-05", 2000), ("2026-09-09", 2000)], start_id=20),
        *rows("cinemas", [("2026-09-01", 100), ("2026-09-05", 100), ("2026-09-09", 100)], start_id=30),
    ]
    svc, *_ = build(mine)
    assert ids(svc) == [TAXI_ID, "max_amount_bars_7d", "max_amount_fast_food_cafes_7d"]


def test_target_rounds_down_and_zero_is_allowed():
    svc, *_ = build(rows("fast_food_cafes", CAFES))
    t = svc.challenge_suggestions(ME).items[0]
    assert t.baseline_cents == 450 and t.rule.amount_cents == 200 and t.rule.amount_cents % 100 == 0
    tiny = rows("fast_food_cafes", [("2026-08-25", 50), ("2026-09-01", 50), ("2026-09-09", 150)])
    svc, *_ = build(tiny)
    t = svc.challenge_suggestions(ME).items[0]
    assert t.rule.amount_cents == 0 and t.estimated_saving_cents == 150


def test_baseline_of_zero_is_skipped():
    svc, *_ = build(rows("fast_food_cafes", [("2026-08-25", 400), ("2026-09-01", 400), ("2026-09-09", 0)]))
    assert ids(svc) == []


def test_no_history_gives_no_suggestions():
    svc, *_ = build([])
    assert ids(svc) == []
    svc, *_ = build(rows("taxis", TAXIS), today=date(2024, 10, 5))
    assert ids(svc) == []


def test_another_customers_data_is_never_used():
    svc, *_ = build([], other=rows("taxis", TAXIS))
    assert ids(svc) == []
    svc, *_ = build(rows("taxis", TAXIS), other=rows("taxis", [("2026-09-09", 99999)] * 5, start_id=50))
    assert svc.challenge_suggestions(ME).items[0].baseline_cents == 9926


def start(svc):
    return svc.start_challenge(ME, StartChallengeRequest(template_id=TAXI_ID))


def test_start_errors_and_initial_progress():
    svc, _, challenges = build(rows("taxis", TAXIS))
    with pytest.raises(NotFound):
        svc.start_challenge(ME, StartChallengeRequest(template_id="max_amount_nothing_7d"))
    p = start(svc)
    assert p.challenge.start_date == TODAY and p.days_left == 7 and p.challenge.status.value == "active"
    assert p.baseline_cents == 9926 and p.baseline_count == 3 and p.current_amount_cents == 0
    assert p.on_track is True and p.concept.id.value == "spending_pace" and p.next_step is None
    with pytest.raises(Conflict):
        start(svc)
    assert len(challenges.rows) == 1


def run_week(extra, today):
    svc, clock, challenges = build(rows("taxis", TAXIS) + extra)
    start(svc)
    clock.set_today(today)
    return svc.list_challenges(ME).items[0], challenges


def test_met_experiment_is_settled_as_won():
    p, challenges = run_week(rows("taxis", [("2026-09-17", 3881)], start_id=60), date(2026, 9, 22))
    assert p.challenge.status.value == "won" and p.on_track is True and p.days_left == 0
    assert p.current_amount_cents == 3881 and p.current_count == 1
    assert p.baseline_cents == 9926 and p.difference_cents == 6045 and p.change_pct == 60.9
    assert p.concept.id.value == "one_week_is_not_proof" and "repeat" in p.next_step
    assert challenges.rows[0].status == "won"


def test_missed_experiment_is_lost_and_change_pct_is_negative():
    extra = rows("taxis", [("2026-09-16", 6000), ("2026-09-18", 6000)], start_id=60)
    p, challenges = run_week(extra, date(2026, 9, 22))
    assert p.challenge.status.value == "lost" and p.on_track is False
    assert p.difference_cents == 9926 - 12000 and p.change_pct == -20.9
    assert p.concept.id.value == "one_week_is_not_proof" and p.next_step
    assert challenges.rows[0].status == "lost"


def test_purchase_on_the_end_date_is_not_counted():
    extra = rows("taxis", [("2026-09-22", 9000)], start_id=60)
    p, _ = run_week(extra, date(2026, 9, 22))
    assert p.challenge.status.value == "won" and p.current_amount_cents == 0


def test_active_on_track_uses_projection_after_a_full_day():
    p, _ = run_week(rows("taxis", [("2026-09-16", 1000)], start_id=60), date(2026, 9, 18))
    assert p.on_track is True and p.challenge.status.value == "active" and p.days_left == 4
    assert "about EUR 23.33" in p.concept.text and "target of EUR 49" in p.concept.text
    assert p.next_step is None


def test_active_off_track_when_projection_exceeds_target_even_if_under_target_so_far():
    p, _ = run_week(rows("taxis", [("2026-09-16", 3881)], start_id=60), date(2026, 9, 18))
    assert p.current_amount_cents == 3881 <= 4900 and p.on_track is False  # 3881 / 3 x 7 = 90.55


def test_active_off_track_when_current_exceeds_target():
    p, _ = run_week(rows("taxis", [("2026-09-15", 5000)], start_id=60), date(2026, 9, 15))
    assert p.on_track is False  # same day: no projection yet, but already over


def test_change_pct_is_null_without_baseline():
    svc, clock, challenges = build(rows("taxis", TAXIS))
    start(svc)
    record = challenges.rows[0]
    from dataclasses import replace
    challenges.rows[0] = replace(record, start_date=date(2026, 7, 1), end_date=date(2026, 7, 8))
    clock.set_today(date(2026, 7, 3))
    p = svc.list_challenges(ME).items[0]
    assert p.baseline_cents == 0 and p.change_pct is None and p.difference_cents == 0
