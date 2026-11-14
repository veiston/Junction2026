import pytest

from contracts.interfaces.controllers.errors import ValidationFailed
from services.chat.glossary import CONCEPT_IDS, render_concept

NUMBERS = {"weekly": 9926, "yearly": 516152, "projected": 3881, "target": 4900}


def sentences(text: str) -> int:
    return len([s for s in text.replace("EUR ", "EUR").split(". ") if s.strip()])


@pytest.mark.parametrize("cid", CONCEPT_IDS)
def test_every_concept_renders_with_and_without_numbers(cid):
    for note in (render_concept(cid, **NUMBERS), render_concept(cid)):
        assert note.id.value == cid and note.title and note.text
        assert "{" not in note.text and "None" not in note.text
        assert sentences(note.text) <= 3


def test_small_purchases_fills_weekly_and_yearly():
    text = render_concept("small_purchases_add_up", weekly=9926, yearly=516152).text
    assert "EUR 99.26 a week" in text and "about EUR 5161.52 a year" in text and "estimate" in text


def test_spending_pace_fills_projected_and_target():
    text = render_concept("spending_pace", projected=3881, target=4900).text
    assert "about EUR 38.81" in text and "target of EUR 49" in text


def test_fallback_when_numbers_are_missing_or_partial():
    assert "EUR" not in render_concept("small_purchases_add_up").text
    assert "EUR" not in render_concept("spending_pace", projected=100).text


def test_unknown_concept_is_a_validation_error():
    with pytest.raises(ValidationFailed):
        render_concept("get_rich_quick")
