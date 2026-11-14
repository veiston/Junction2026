"""Slice 1 - Understand my money: REST endpoints used by the widgets (month switch, trend range...)."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query, Request

from api.dependencies import get_session_service
from api.security import CustomerId
from contracts.dto.common import Basket, Category, SpendGroup
from contracts.dto.understand import (
    BasketBreakdown, BasketTrend, PeerBenchmark, SpenderProfile, SpendingSummary,
)
from services.understand.wiring import build_service

router = APIRouter()

YEAR_MONTH = r"^[0-9]{4}-(0[1-9]|1[0-2])$"


def get_understand_service(request: Request, session: Annotated[Any, Depends(get_session_service)]) -> Any:
    """Built per request with the demo 'today'. Tests replace it with app.dependency_overrides."""
    return build_service(request.app.state.config, session.get_clock().today)


Service = Annotated[Any, Depends(get_understand_service)]


@router.get("/understand/baskets", response_model=BasketBreakdown)
def get_basket_breakdown(
    cid: CustomerId,
    svc: Service,
    month: Annotated[str | None, Query(pattern=YEAR_MONTH)] = None,
) -> Any:
    return svc.basket_breakdown(cid, month)


@router.get("/understand/trend", response_model=BasketTrend)
def get_basket_trend(
    cid: CustomerId,
    svc: Service,
    months: Annotated[int, Query(ge=1, le=12)] = 6,
) -> Any:
    return svc.basket_trend(cid, months)


@router.get("/understand/spending", response_model=SpendingSummary)
def get_spending(
    cid: CustomerId,
    svc: Service,
    session: Annotated[Any, Depends(get_session_service)],
    basket: Basket | None = None,
    category: Category | None = None,
    spend_group: SpendGroup | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> Any:
    """Exactly one of basket/category/spend_group (checked by the service). Default period: this month."""
    today = session.get_clock().today
    to_date = to_date or today
    from_date = from_date or to_date.replace(day=1)
    return svc.spending(cid, from_date, to_date, basket=basket, category=category, spend_group=spend_group)


@router.get("/understand/profile", response_model=SpenderProfile)
def get_spender_profile(cid: CustomerId, svc: Service) -> Any:
    return svc.spender_profile(cid)


@router.get("/understand/benchmark", response_model=PeerBenchmark)
def get_peer_benchmark(
    cid: CustomerId,
    svc: Service,
    scope: Literal["basket", "category"],
    key: str,
) -> Any:
    return svc.peer_benchmark(cid, scope, key)
