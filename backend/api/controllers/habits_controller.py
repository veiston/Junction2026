"""Slice stub: every route answers 501 until the habits slice is merged."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.controllers._stub import not_implemented

router = APIRouter(dependencies=[Depends(not_implemented)])


@router.get("/habits/limit-suggestion")
def get_habits_limit_suggestion() -> None: ...


@router.post("/habits/limits")
def post_habits_limits() -> None: ...


@router.get("/habits/limits/current")
def get_habits_limits_current() -> None: ...


@router.get("/habits/limits/{limit_id}/review")
def get_habits_limits_limit_id_review() -> None: ...


@router.get("/habits/challenges/suggestions")
def get_habits_challenges_suggestions() -> None: ...


@router.get("/habits/challenges")
def get_habits_challenges() -> None: ...


@router.post("/habits/challenges")
def post_habits_challenges() -> None: ...
