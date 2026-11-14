"""Habits endpoints: monthly limit and challenges. customer_id comes only from the token."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from api.dependencies import get_habits_service
from api.security import CustomerId
from contracts.dto.habits import (
    ChallengeList,
    ChallengeProgress,
    ChallengeSuggestions,
    CreateLimitRequest,
    LimitProgress,
    LimitReview,
    LimitSuggestion,
    SpendingLimit,
    StartChallengeRequest,
)

router = APIRouter()
Habits = Annotated[Any, Depends(get_habits_service)]


@router.get("/habits/limit-suggestion", response_model=LimitSuggestion)
def get_habits_limit_suggestion(cid: CustomerId, svc: Habits) -> Any:
    return svc.limit_suggestion(cid)


@router.post("/habits/limits", response_model=SpendingLimit, status_code=201)
def post_habits_limits(body: CreateLimitRequest, cid: CustomerId, svc: Habits) -> Any:
    return svc.create_limit(cid, body)


@router.get("/habits/limits/current", response_model=LimitProgress)
def get_habits_limits_current(cid: CustomerId, svc: Habits) -> Any:
    return svc.current_limit_progress(cid)


@router.get("/habits/limits/{limit_id}/review", response_model=LimitReview)
def get_habits_limits_limit_id_review(limit_id: int, cid: CustomerId, svc: Habits) -> Any:
    return svc.limit_review(cid, limit_id)


@router.get("/habits/challenges/suggestions", response_model=ChallengeSuggestions)
def get_habits_challenges_suggestions(cid: CustomerId, svc: Habits) -> Any:
    return svc.challenge_suggestions(cid)


@router.get("/habits/challenges", response_model=ChallengeList)
def get_habits_challenges(cid: CustomerId, svc: Habits) -> Any:
    return svc.list_challenges(cid)


@router.post("/habits/challenges", response_model=ChallengeProgress, status_code=201)
def post_habits_challenges(body: StartChallengeRequest, cid: CustomerId, svc: Habits) -> Any:
    return svc.start_challenge(cid, body)


@router.post("/habits/challenges/{challenge_id}/stop", response_model=ChallengeProgress)
def post_habits_challenges_challenge_id_stop(challenge_id: int, cid: CustomerId, svc: Habits) -> Any:
    return svc.stop_challenge(cid, challenge_id)
