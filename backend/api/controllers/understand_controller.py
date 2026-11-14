"""Slice stub: every route answers 501 until the understand slice is merged."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api.controllers._stub import not_implemented

router = APIRouter(dependencies=[Depends(not_implemented)])


@router.get("/understand/baskets")
def get_understand_baskets() -> None: ...


@router.get("/understand/trend")
def get_understand_trend() -> None: ...


@router.get("/understand/spending")
def get_understand_spending() -> None: ...


@router.get("/understand/profile")
def get_understand_profile() -> None: ...


@router.get("/understand/benchmark")
def get_understand_benchmark() -> None: ...
