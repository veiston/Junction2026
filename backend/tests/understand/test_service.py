"""Unit tests for UnderstandServiceImpl on the in-memory fakes (fixture customer, today 2026-09-15)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from contracts.dto.common import Basket, Category, SpendGroup
from contracts.interfaces.controllers.errors import NotFound, ValidationFailed
from contracts.interfaces.repositories.shared import CustomerRecord
from services.understand.persona import FORBIDDEN_WORDS
from tests.fakes.fixtures import CUSTOMER_ID, FIXTURE_CUSTOMER, FIXTURE_TRANSACTIONS
from tests.understand._builders import make_service, salary, spend

TODAY = date(2026, 9, 15)


@pytest.fixture
def svc():
    return make_service()[0]


def spent_where(pred) -> int:
    """Independent reference: positive sum of the fixture's visible spending rows matching pred."""
    return -sum(t.amount_cents for t in FIXTURE_TRANSACTIONS
                if t.date <= TODAY and t.flow.value == "spending" and pred(t))


# ---------------------------------------------------------------- basket breakdown (US-U1)
def test_breakdown_defaults_to_the_month_of_today_and_is_partial(svc):
    b = svc.basket_breakdown(CUSTOMER_ID, None)
    assert b.month == "2026-09" and b.is_partial_month is True
    assert [d.basket for d in b.baskets] == [Basket.mandatory_regular, Basket.mandatory_irregular, Basket.everyday]
    assert [d.amount_cents for d in b.baskets] == [122630, 20900, 11350]
    assert [d.tx_count for d in b.baskets] == [5, 2, 5]
    assert b.total_spending_cents == 154880
    assert b.income_cents == 320000 and b.saving_cents == 0
    assert b.source.period.from_date == date(2026, 9, 1) and b.source.period.to_date == TODAY


def test_breakdown_sums_equal_the_raw_rows(svc):
    b = svc.basket_breakdown(CUSTOMER_ID, "2026-09")
    in_sep = lambda t: date(2026, 9, 1) <= t.date <= TODAY  # noqa: E731
    for d in b.baskets:
        assert d.amount_cents == spent_where(lambda t: in_sep(t) and t.basket == d.basket)
    assert b.total_spending_cents == sum(d.amount_cents for d in b.baskets)
    assert abs(sum(d.share_pct for d in b.baskets) - 100) <= 0.2


def test_breakdown_never_counts_rows_after_today(svc):
    b = svc.basket_breakdown(CUSTOMER_ID, "2026-09")
    # 2026-09-20 supermarket (62 EUR) and 2026-09-25 restaurant (41 EUR) are in the future
    assert b.baskets[0].amount_cents == 122630 and b.baskets[2].amount_cents == 11350


def test_partial_month_is_compared_with_the_same_days_of_the_previous_month(svc):
    b = svc.basket_breakdown(CUSTOMER_ID, None)
    # 1-15 Aug only: the hardware row of 16 Aug is left out
    assert [d.previous_amount_cents for d in b.baskets] == [115230, 2390, 5150]
    assert b.baskets[2].change_pct == round((11350 - 5150) / 5150 * 100, 1)


def test_full_month_and_change_pct_none_when_previous_is_zero(svc):
    b = svc.basket_breakdown(CUSTOMER_ID, "2026-08")
    assert b.is_partial_month is False
    assert b.baskets[1].amount_cents == 2390 + 4590
    assert b.saving_cents == 20000
    assert all(d.previous_amount_cents == 0 and d.change_pct is None for d in b.baskets)


def test_top_groups_are_largest_first_and_at_most_five(svc):
    b = svc.basket_breakdown(CUSTOMER_ID, "2026-08")
    regular = b.baskets[0].top_groups
    assert [g.amount_cents for g in regular] == sorted((g.amount_cents for g in regular), reverse=True)
    assert len(regular) <= 5
    supermarkets = next(g for g in regular if g.spend_group == SpendGroup.supermarkets)
    assert supermarkets.amount_cents == 6420 + 5310 + 7120 and supermarkets.tx_count == 3
    assert supermarkets.label == "Supermarkets"


@pytest.mark.parametrize("month", ["2026-9", "2026-13", "abc", "2026-10", "2024-09"])
def test_breakdown_rejects_bad_months(svc, month):
    with pytest.raises(ValidationFailed):
        svc.basket_breakdown(CUSTOMER_ID, month)


def test_breakdown_of_a_customer_without_rows_is_all_zero():
    svc, _ = make_service({CUSTOMER_ID: []})
    b = svc.basket_breakdown(CUSTOMER_ID, None)
    assert b.total_spending_cents == 0
    assert all(d.amount_cents == 0 and d.share_pct == 0 and d.top_groups == [] for d in b.baskets)


# ---------------------------------------------------------------- trend (US-U4)
def test_trend_is_oldest_first_with_three_baskets_per_month(svc):
    t = svc.basket_trend(CUSTOMER_ID, 6)
    assert [m.month for m in t.months] == ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
    assert all(len(m.baskets) == 3 for m in t.months)
    aug = t.months[4]
    assert [b.amount_cents for b in aug.baskets] == [
        spent_where(lambda r, b=b: r.date.month == 8 and r.basket == b.basket) for b in aug.baskets
    ]
    assert t.months[5].baskets[2].amount_cents == 11350  # September is cut at today
    assert all(b.amount_cents == 0 for b in t.months[0].baskets)


@pytest.mark.parametrize("months", [0, 13, -1])
def test_trend_rejects_out_of_range(svc, months):
    with pytest.raises(ValidationFailed):
        svc.basket_trend(CUSTOMER_ID, months)


def test_trend_never_goes_before_the_data_start():
    svc, _ = make_service(today=date(2024, 11, 10))
    assert [m.month for m in svc.basket_trend(CUSTOMER_ID, 6).months] == ["2024-10", "2024-11"]


# ---------------------------------------------------------------- spending (US-U2)
def test_spending_on_taxis_last_month(svc):
    s = svc.spending(CUSTOMER_ID, date(2026, 8, 1), date(2026, 8, 31), spend_group=SpendGroup.taxis)
    assert (s.label, s.amount_cents, s.tx_count, s.average_tx_cents) == ("Taxis", 2100, 1, 2100)
    assert s.previous_period_amount_cents == 0
    assert [t.amount_cents for t in s.sample_transactions] == [-2100]


def test_spending_on_a_basket_has_largest_samples_first_and_previous_period(svc):
    s = svc.spending(CUSTOMER_ID, date(2026, 9, 1), date(2026, 9, 15), basket=Basket.everyday)
    assert s.amount_cents == 11350 and s.tx_count == 5
    assert [t.amount_cents for t in s.sample_transactions] == [-4500, -2800, -1950, -1120, -980]
    # previous period = the 15 days right before: 17-31 Aug
    assert s.previous_period_amount_cents == 3850 + 7900
    assert s.label == "Everyday"


def test_spending_on_a_category_matches_the_rows(svc):
    s = svc.spending(CUSTOMER_ID, date(2026, 9, 1), date(2026, 9, 30), category=Category.Restaurants)
    assert s.amount_cents == spent_where(lambda t: t.date.month == 9 and t.category == Category.Restaurants)
    assert s.query.to_date == TODAY  # clamped: no data after today


def test_spending_accepts_plain_strings(svc):
    s = svc.spending(CUSTOMER_ID, date(2026, 8, 1), date(2026, 8, 31), spend_group="taxis")
    assert s.amount_cents == 2100


@pytest.mark.parametrize("kwargs", [
    {},
    {"basket": Basket.everyday, "spend_group": SpendGroup.taxis},
    {"category": Category.Salary},
])
def test_spending_needs_exactly_one_spending_filter(svc, kwargs):
    with pytest.raises(ValidationFailed):
        svc.spending(CUSTOMER_ID, date(2026, 8, 1), date(2026, 8, 31), **kwargs)


@pytest.mark.parametrize("from_date,to_date", [
    (date(2026, 9, 2), date(2026, 9, 1)),     # reversed
    (date(2024, 9, 30), date(2024, 10, 5)),   # before data start
    (date(2026, 9, 16), date(2026, 9, 20)),   # starts in the future
    (date(2025, 1, 1), date(2026, 1, 2)),     # longer than 366 days
])
def test_spending_rejects_bad_ranges(svc, from_date, to_date):
    with pytest.raises(ValidationFailed):
        svc.spending(CUSTOMER_ID, from_date, to_date, basket=Basket.everyday)


# ---------------------------------------------------------------- spender profile (US-U3)
def _days(n: int, today: date = TODAY):
    return [today - timedelta(days=i) for i in range(n)]


def _profile(rows):
    svc, _ = make_service({CUSTOMER_ID: rows})
    return svc.spender_profile(CUSTOMER_ID)


def _no_blame(profile) -> None:
    texts = [profile.title, profile.description, *profile.tips,
             *(f"{t.label} {t.value_text} {t.evidence}" for t in profile.traits)]
    for text in texts:
        assert not any(w in text.lower().split() for w in FORBIDDEN_WORDS), text


def test_profile_with_less_than_60_days_is_balanced(svc):
    p = svc.spender_profile(CUSTOMER_ID)  # fixture data starts 2026-08-01: 46 days
    assert p.persona.value == "balanced"
    assert len(p.traits) == 5 and len(p.tips) <= 3
    _no_blame(p)


def test_weekend_socialiser():
    rows = [spend(i, d.isoformat(), "restaurants", 3000 if d.weekday() >= 4 else 300)
            for i, d in enumerate(_days(90))]
    p = _profile(rows)
    assert p.persona.value == "weekend_socialiser" and p.metrics.weekend_share_pct >= 55
    _no_blame(p)


def test_payday_splurger_wins_over_weekend():
    rows, i = [], 0
    for d in _days(90):
        if d.day == 1:
            rows.append(salary(i := i + 1, d.isoformat()))
        rows.append(spend(i := i + 1, d.isoformat(), "restaurants", 5000 if d.day <= 4 else 400))
    p = _profile(rows)
    assert p.persona.value == "payday_splurger" and p.metrics.post_payday_share_pct >= 25
    _no_blame(p)


def test_small_leaks():
    rows = [spend(n, d.isoformat(), "fast_food_cafes", 450) for n, d in enumerate(_days(90) * 2)]
    p = _profile(rows)
    assert p.persona.value == "small_leaks"
    assert p.metrics.micro_spend_monthly_cents == round(450 * 180 / 3)
    _no_blame(p)


def test_steady_planner():
    rows = []
    for n, d in enumerate(_days(90)):
        rows.append(spend(2 * n, d.isoformat(), "supermarkets", 5000))
        rows.append(spend(2 * n + 1, d.isoformat(), "taxis", 2000 if d.weekday() == 2 else 0))
    rows = [r for r in rows if r.amount_cents != 0]
    p = _profile(rows)
    assert p.persona.value == "steady_planner" and p.metrics.everyday_share_pct <= 25
    _no_blame(p)


def test_late_night_share_counts_21_to_05():
    rows = [spend(n, d.isoformat(), "bars", 2000, hour=23 if n % 2 else 13) for n, d in enumerate(_days(90))]
    assert _profile(rows).metrics.late_night_share_pct == pytest.approx(50, abs=1)


# ---------------------------------------------------------------- peers (US-U5, US-U6)
def _peers(n_helsinki: int, n_espoo: int = 0):
    customers = [FIXTURE_CUSTOMER]
    by_customer = {CUSTOMER_ID: FIXTURE_TRANSACTIONS}
    for i in range(1, n_helsinki + n_espoo + 1):
        cid = f"P{i:03d}"
        region = "Helsinki" if i <= n_helsinki else "Espoo"
        customers.append(CustomerRecord(cid, "00100", 30, "25-34", region))
        # i * 10 EUR of everyday spending in each of Jun, Jul, Aug
        by_customer[cid] = [spend(k, f"2026-0{m}-10", "restaurants", i * 1000) for k, m in enumerate((6, 7, 8))]
    customers.append(CustomerRecord("OLD", "00100", 70, "65+", "Helsinki"))
    return make_service(by_customer, customers)[0]


def test_peer_benchmark_statistics():
    b = _peers(35).peer_benchmark(CUSTOMER_ID, "basket", "everyday")
    assert b.your_monthly_cents == round(16900 / 3)  # August everyday only, over 3 months
    assert (b.peer_median_monthly_cents, b.peer_p25_monthly_cents, b.peer_p75_monthly_cents) == (18000, 9500, 26500)
    assert b.your_percentile == round(5 / 35 * 100)
    assert (b.peer_group.region, b.peer_group.size, b.peer_group.age_band.value) == ("Helsinki", 35, "25-34")
    assert b.your_share_of_spending_pct == round(16900 / 151730 * 100, 1)
    assert b.label == "Everyday" and b.open_data is None
    assert (b.source.period.from_date, b.source.period.to_date) == (date(2026, 6, 1), date(2026, 8, 31))


def test_small_peer_group_widens_to_all_regions():
    b = _peers(20, 15).peer_benchmark(CUSTOMER_ID, "basket", "everyday")
    assert (b.peer_group.region, b.peer_group.size) == ("All regions", 35)


def test_category_benchmark_uses_open_data():
    class OpenData:
        def household_share(self, category):
            from contracts.dto.understand import OpenDataReference
            return OpenDataReference(label="Finnish households", share_of_spending_pct=5.0, year=2022,
                                     source_url="https://stat.fi") if category == "Restaurants" else None

    svc, _ = make_service(open_data=OpenData())
    b = svc.peer_benchmark(CUSTOMER_ID, "category", "Restaurants")
    assert b.open_data is not None and b.open_data.year == 2022
    assert b.your_monthly_cents == round((1250 + 3850) / 3)
    assert svc.peer_benchmark(CUSTOMER_ID, "basket", "everyday").open_data is None


@pytest.mark.parametrize("scope,key", [("basket", "food"), ("category", "Salary"), ("city", "everyday")])
def test_peer_benchmark_rejects_bad_scope_or_key(svc, scope, key):
    with pytest.raises(ValidationFailed):
        svc.peer_benchmark(CUSTOMER_ID, scope, key)


def test_peer_benchmark_unknown_customer(svc):
    with pytest.raises(NotFound):
        svc.peer_benchmark("NOPE", "basket", "everyday")
