from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from api.dependencies import get_plan_service
from api.security import CustomerId
from contracts.dto.plan import (
    BalanceForecast,
    ExpenseAlerts,
    HorizonDays,
    SafeToSpend,
    UpcomingBills,
    WhatIfRequest,
    WhatIfResult,
)
from services.plan.alerts import MAX_ALERT_DAYS, MIN_ALERT_DAYS

DEFAULT_ALERT_DAYS = 90

router = APIRouter()


@router.get("/plan/forecast", response_model=BalanceForecast)
def get_plan_forecast(
    cid: CustomerId,
    svc: Annotated[Any, Depends(get_plan_service)],
    horizon_days: HorizonDays = HorizonDays.integer_30,
) -> Any:
    return svc.forecast(cid, horizon_days)


@router.get("/plan/bills", response_model=UpcomingBills)
def get_plan_bills(
    cid: CustomerId,
    svc: Annotated[Any, Depends(get_plan_service)],
    horizon_days: HorizonDays = HorizonDays.integer_30,
) -> Any:
    return svc.upcoming_bills(cid, horizon_days)


@router.get("/plan/alerts", response_model=ExpenseAlerts)
def get_plan_alerts(
    cid: CustomerId,
    svc: Annotated[Any, Depends(get_plan_service)],
    days: Annotated[int, Query(ge=MIN_ALERT_DAYS, le=MAX_ALERT_DAYS)] = DEFAULT_ALERT_DAYS,
) -> Any:
    return svc.expense_alerts(cid, days)


@router.get("/plan/safe-to-spend", response_model=SafeToSpend)
def get_plan_safe_to_spend(
    cid: CustomerId,
    svc: Annotated[Any, Depends(get_plan_service)],
) -> Any:
    return svc.safe_to_spend(cid)


@router.post("/plan/what-if", response_model=WhatIfResult)
def post_plan_what_if(
    body: WhatIfRequest,
    cid: CustomerId,
    svc: Annotated[Any, Depends(get_plan_service)],
) -> Any:
    return svc.what_if(cid, body)
