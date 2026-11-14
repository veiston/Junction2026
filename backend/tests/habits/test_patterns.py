"""Spending patterns of one habit: small and often, a few big ones, weekend, rising."""
from __future__ import annotations

import pytest

from services.habits.patterns import detect
from tests.habits.world import tx


def rows(items, group="taxis"):
    return [tx(i + 1, d, group, c) for i, (d, c) in enumerate(items)]


def test_many_small_purchases_add_up():
    r = rows([("2026-09-08", 400), ("2026-09-09", 450), ("2026-09-11", 380), ("2026-09-14", 420)], "fast_food_cafes")
    p = detect(r, sum(c for _, c in [("", 400), ("", 450), ("", 380), ("", 420)]), 0)
    assert p.id == "small_often" and "Many small purchases" in p.sentence and "EUR 4.12" in p.sentence


def test_a_few_bigger_purchases():
    r = rows([("2026-09-08", 3000), ("2026-09-10", 3500), ("2026-09-11", 3426)])  # Tue, Thu, Fri
    p = detect(r, 9926, 0)
    assert p.id == "few_big" and "A few bigger purchases" in p.sentence and "EUR 33.08" in p.sentence


def test_weekend_spending():
    r = rows([("2026-09-12", 4000), ("2026-09-13", 5000), ("2026-09-09", 500)])  # Sat, Sun, Wed
    assert detect(r, 9500, 0).id == "weekend"


def test_rising_wins_over_the_others():
    r = rows([("2026-09-08", 3000), ("2026-09-10", 3500), ("2026-09-11", 3426)])
    p = detect(r, 9926, 5000)  # a usual week was EUR 50
    assert p.id == "rising" and "EUR 50" in p.sentence


@pytest.mark.parametrize("usual", [0, 8000, 9926])
def test_a_flat_week_is_not_rising(usual):
    r = rows([("2026-09-08", 3000), ("2026-09-10", 3500), ("2026-09-11", 3426)])
    assert detect(r, 9926, usual).id == "few_big"
