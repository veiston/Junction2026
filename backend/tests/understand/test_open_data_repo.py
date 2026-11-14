"""Tests for the static Statistics Finland repository and its seed file."""

from __future__ import annotations

import json

from contracts.dto.common import Category
from models.repositories.open_data_repo import DEFAULT_PATH, JsonOpenDataRepository
from services.understand.service import NON_SPENDING_CATEGORIES


def test_seed_file_rows_are_valid():
    doc = json.loads(DEFAULT_PATH.read_text(encoding="utf-8"))
    categories = {c.value for c in Category}
    assert doc["year"] == 2022 and doc["source_url"].startswith("https://")
    for row in doc["rows"]:
        assert row["category"] in categories and row["category"] not in NON_SPENDING_CATEGORIES
        assert 0 < row["share_of_spending_pct"] < 100


def test_known_category_returns_a_reference():
    ref = JsonOpenDataRepository().household_share("Groceries")
    assert ref is not None
    assert ref.year == 2022 and ref.share_of_spending_pct == 12.6
    assert "food" in ref.label and "stat.fi" in ref.source_url


def test_category_without_a_match_returns_none():
    repo = JsonOpenDataRepository()
    assert repo.household_share("Travel") is None
    assert repo.household_share("Salary") is None


def test_missing_file_means_no_references(tmp_path):
    assert JsonOpenDataRepository(tmp_path / "nope.json").household_share("Groceries") is None
