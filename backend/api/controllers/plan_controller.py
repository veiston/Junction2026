"""Slice stub: every route answers 501 until the plan slice is merged."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.controllers._stub import not_implemented

router = APIRouter(dependencies=[Depends(not_implemented)])


@router.get("/plan/forecast")
def get_plan_forecast() -> None: ...


@router.get("/plan/bills")
def get_plan_bills() -> None: ...


@router.get("/plan/alerts")
def get_plan_alerts() -> None: ...


@router.get("/plan/safe-to-spend")
def get_plan_safe_to_spend() -> None: ...


@router.post("/plan/what-if")
def post_plan_what_if() -> None: ...
