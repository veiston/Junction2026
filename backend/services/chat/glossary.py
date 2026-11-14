"""Glossary of the five fixed money concepts. Texts are written by the team; numbers come from the caller."""
from __future__ import annotations

from collections.abc import Callable

from contracts.dto.common import ConceptNote
from contracts.interfaces.controllers.errors import ValidationFailed

TITLES = {
    "small_purchases_add_up": "Small purchases add up",
    "compare_equal_periods": "Compare equal periods",
    "fixed_vs_everyday": "Fixed vs everyday spending",
    "spending_pace": "Spending pace",
    "one_week_is_not_proof": "One week is not proof",
}
CONCEPT_IDS = tuple(TITLES)


def euros(cents: int) -> str:
    """'EUR 49' for whole euros, 'EUR 99.26' otherwise."""
    value = abs(int(cents)) / 100
    sign = "-" if cents < 0 else ""
    return f"{sign}EUR {value:.0f}" if int(cents) % 100 == 0 else f"{sign}EUR {value:.2f}"


def _have(numbers: dict, *keys: str) -> bool:
    return all(isinstance(numbers.get(k), int) and not isinstance(numbers.get(k), bool) for k in keys)


def _small_purchases(n: dict) -> str:
    if _have(n, "weekly", "yearly"):
        return (f"A small purchase repeated several times a week looks harmless. "
                f"At {euros(n['weekly'])} a week it adds up to about {euros(n['yearly'])} a year. "
                "This yearly figure is an estimate.")
    return ("A small purchase repeated several times a week looks harmless. "
            "Over a year, small regular amounts add up to a lot. Any yearly figure is only an estimate.")


def _equal_periods(_: dict) -> str:
    return ("To see whether a change worked, compare this week with the week before it. "
            "Same length, same weekdays, so the comparison is fair.")


def _fixed_vs_everyday(_: dict) -> str:
    return ("Rent and bills are hard to change in a week. "
            "Everyday spending like cafes and taxis is where small changes show up quickly, "
            "so experiments start there.")


def _pace(n: dict) -> str:
    if _have(n, "projected", "target"):
        return (f"Pace is what you spend per day so far. At this pace you would spend about "
                f"{euros(n['projected'])} by the end of the 7 days, against your target of {euros(n['target'])}.")
    return ("Pace is what you spend per day so far. Multiply it by the 7 days to see roughly where "
            "the week will end, and compare that with your target.")


def _not_proof(_: dict) -> str:
    return ("One good week is a good sign, not proof of a new habit. "
            "Repeating the experiment tells you more.")


_TEXTS: dict[str, Callable[[dict], str]] = {
    "small_purchases_add_up": _small_purchases,
    "compare_equal_periods": _equal_periods,
    "fixed_vs_everyday": _fixed_vs_everyday,
    "spending_pace": _pace,
    "one_week_is_not_proof": _not_proof,
}


def render_concept(concept_id: str, **numbers: int) -> ConceptNote:
    """Numbers are euro cents: weekly, yearly, projected, target. Missing numbers give a general text."""
    if concept_id not in _TEXTS:
        raise ValidationFailed(f"Unknown concept: {concept_id!r}.",
                               [{"field": "concept_id", "issue": f"must be one of {list(CONCEPT_IDS)}"}])
    return ConceptNote(id=concept_id, title=TITLES[concept_id], text=_TEXTS[concept_id](numbers))
