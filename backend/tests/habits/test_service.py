from __future__ import annotations

from datetime import date

import pytest

from contracts.dto.habits import CreateLimitRequest, StartChallengeRequest
from contracts.interfaces.controllers.errors import Conflict, NotFound, ValidationFailed
from tests.habits.world import ME, OTHER, make_world


@pytest.fixture
def world():
    return make_world()


def test_suggestion_follows_everyday_history(world):
    svc, *_ = world
    s = svc.limit_suggestion(ME)
    assert s.month == "2026-09" and s.basket == "everyday"
    # oldest first; Aug = 5 taxi rides 20000 + bars 25000 + cinemas 5000; the supermarket row is not everyday
    assert [(h.month, h.amount_cents) for h in s.history] == [
        ("2026-06", 30000), ("2026-07", 40000), ("2026-08", 50000)]


def test_suggestion_numbers(world):
    svc, *_ = world
    s = svc.limit_suggestion(ME)
    avg = sum(h.amount_cents for h in s.history) // 3
    assert s.suggested_cents == avg * 9 // 10 // 1000 * 1000
    assert s.min_cents == avg // 2 // 1000 * 1000 and s.max_cents == avg * 12 // 10 // 1000 * 1000
    assert s.min_cents <= s.suggested_cents <= s.max_cents and s.step_cents == 1000
    assert s.expected_saving_cents == avg - s.suggested_cents
    assert len(s.history) <= 6 and s.source.tx_count == 1 + 1 + 7


def test_suggestion_without_history_is_still_valid():
    svc, *_ = make_world(date(2024, 10, 5))
    s = svc.limit_suggestion(ME)
    assert s.history == [] and 1000 <= s.min_cents <= s.suggested_cents <= s.max_cents


def test_suggestion_is_per_customer(world):
    svc, *_ = world
    assert svc.limit_suggestion(OTHER).history[-1].amount_cents == 0


def test_create_limit_and_second_accept_conflicts(world):
    svc, _, limits, _ = world
    created = svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=30000))
    assert created.id and created.status.value == "active" and created.amount_cents == 30000
    with pytest.raises(Conflict):
        svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=20000))
    assert len(limits.rows) == 1
    # another customer is not blocked
    assert svc.create_limit(OTHER, CreateLimitRequest(month="2026-09", amount_cents=20000)).id


def test_create_limit_wrong_month_is_validation_error(world):
    svc, *_ = world
    with pytest.raises(ValidationFailed):
        svc.create_limit(ME, CreateLimitRequest(month="2026-10", amount_cents=30000))


def test_progress_404_without_limit(world):
    svc, *_ = world
    with pytest.raises(NotFound):
        svc.current_limit_progress(ME)


def test_progress_numbers(world):
    svc, *_ = world
    svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=30000))
    p = svc.current_limit_progress(ME)
    assert p.spent_cents == 8500  # 6000 bars + 2500 taxis, not the row after today
    assert p.remaining_cents == 21500 and p.days_elapsed == 15 and p.days_in_month == 30
    assert p.on_pace_cents == 15000 and p.status.value == "on_track"
    assert len(p.daily) == 15 and p.daily[-1].cumulative_cents == 8500 and p.daily[0].cumulative_cents == 0
    assert [g.spend_group.value for g in p.top_groups] == ["bars", "taxis"]


def test_progress_at_risk_and_on_track():
    svc, *_ = make_world()
    svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=12000))
    assert svc.current_limit_progress(ME).status.value == "at_risk"  # 8500 > 6000 * 1.1 but <= 12000
    svc2, *_ = make_world()
    svc2.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=8000))
    assert svc2.current_limit_progress(ME).status.value == "over"
    svc3, *_ = make_world()
    svc3.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=17000))
    assert svc3.current_limit_progress(ME).status.value == "on_track"  # pace 8500, spent 8500


def test_progress_follows_the_clock(world):
    svc, clock, *_ = world
    svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=30000))
    clock.set_today(date(2026, 9, 2))
    p = svc.current_limit_progress(ME)
    assert p.spent_cents == 0 and p.days_elapsed == 2
    clock.set_today(date(2026, 10, 1))
    with pytest.raises(NotFound):
        svc.current_limit_progress(ME)


def test_review_missing_or_foreign_limit_is_404(world):
    svc, *_ = world
    limit = svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=30000))
    with pytest.raises(NotFound):
        svc.limit_review(ME, 999)
    with pytest.raises(NotFound):
        svc.limit_review(OTHER, limit.id)


def test_review_values(world):
    svc, clock, *_ = world
    limit = svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=7000))
    clock.set_today(date(2026, 9, 30))
    r = svc.limit_review(ME, limit.id)
    assert r.final_spent_cents == 6000 + 2500 + 77700
    assert r.met is False and r.difference_cents == 7000 - r.final_spent_cents
    assert r.previous_month_cents == 20000 + 25000 + 5000
    assert r.biggest_leak.spend_group.value == "bars"
    assert r.best_week_start is not None


def test_review_mid_month_met(world):
    svc, _, *_ = world
    limit = svc.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=30000))
    r = svc.limit_review(ME, limit.id)
    assert r.met and r.final_spent_cents == 8500 and r.difference_cents == 21500
    # windows containing the 3rd hold 6000, Sep 4-10 holds only 2500, Sep 11-15 is shorter than a week
    assert r.best_week_start == date(2026, 9, 4) or r.best_week_start == date(2026, 9, 9)


def test_challenge_suggestions_personal_and_capped(world):
    svc, *_ = world
    items = svc.challenge_suggestions(ME).items
    assert [t.id for t in items] == ["max_amount_taxis_7d"]  # 3 taxi rides in 28 days, one in the baseline week
    assert items[0].baseline_cents == 2500 and items[0].rule.amount_cents == 1200
    assert [t.id for t in svc.challenge_suggestions(OTHER).items] == []


def test_start_challenge_errors_and_progress(world):
    svc, clock, _, challenges = world
    with pytest.raises(NotFound):
        svc.start_challenge(ME, StartChallengeRequest(template_id="max_amount_nothing_7d"))
    started = svc.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    assert started.challenge.id and started.days_left == 7 and started.on_track is True
    assert started.challenge.start_date == date(2026, 9, 15)
    with pytest.raises(Conflict):
        svc.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    assert len(challenges.rows) == 1


def test_list_progress_and_settlement(world):
    svc, clock, _, challenges = world
    svc.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    clock.set_today(date(2026, 9, 18))
    (item,) = svc.list_challenges(ME).items
    assert item.current_count == 0 and item.on_track and item.days_left == 4
    assert item.progress_pct == round(3 / 7 * 100, 1)
    clock.set_today(date(2026, 9, 22))
    (done,) = svc.list_challenges(ME).items
    assert done.challenge.status.value == "won" and challenges.rows[0].status == "won"
    assert svc.list_challenges(OTHER).items == []
