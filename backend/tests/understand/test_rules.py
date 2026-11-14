"""Unit tests for the pure rule modules: persona choice and peer statistics."""

from __future__ import annotations

import pytest

from contracts.dto.understand import Metrics, Persona
from services.understand import persona as P
from services.understand.benchmark import percentile_rank, quantile


def metrics(**over) -> Metrics:
    base = dict(weekend_share_pct=40.0, late_night_share_pct=5.0, post_payday_share_pct=10.0,
                micro_spend_monthly_cents=1000, everyday_share_pct=40.0)
    return Metrics(**{**base, **over})


@pytest.mark.parametrize("over,micro,days,expected", [
    ({}, 0, 90, Persona.balanced),
    ({"post_payday_share_pct": 25.0, "weekend_share_pct": 90.0}, 99, 90, Persona.payday_splurger),
    ({"weekend_share_pct": 55.0}, 99, 90, Persona.weekend_socialiser),
    ({}, 40, 90, Persona.small_leaks),
    ({"everyday_share_pct": 25.0}, 0, 90, Persona.steady_planner),
    ({"post_payday_share_pct": 80.0}, 0, 59, Persona.balanced),  # too little data
])
def test_first_match_wins(over, micro, days, expected):
    assert P.choose_persona(metrics(**over), micro, days) is expected


def test_no_text_uses_a_blame_word():
    for persona in Persona:
        title, description = P._TEXTS[persona]
        texts = [title, description, *P._tips(persona, metrics(micro_spend_monthly_cents=12345))]
        texts += [f"{t.label} {t.value_text} {t.evidence}" for t in P._traits(metrics(), 12)]
        for text in texts:
            words = text.lower().replace(".", " ").replace(",", " ").split()
            assert not set(words) & set(P.FORBIDDEN_WORDS), (persona, text)
        assert len(P._tips(persona, metrics())) <= 3


def test_quantile_matches_linear_interpolation():
    values = [1000 * i for i in range(1, 36)]
    assert quantile(values, 0.5) == 18000
    assert quantile(values, 0.25) == 9500
    assert quantile(values, 0.75) == 26500
    assert quantile([], 0.5) == 0
    assert quantile([7], 0.25) == 7


def test_percentile_rank_counts_strictly_lower():
    assert percentile_rank(30, [10, 20, 30, 40]) == 50
    assert percentile_rank(5, [10, 20]) == 0
    assert percentile_rank(99, [10, 20]) == 100
    assert percentile_rank(1, []) == 0
