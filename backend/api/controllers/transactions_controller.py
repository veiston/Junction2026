from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from api.dependencies import get_transaction_service
from api.security import CustomerId
from contracts.dto.common import Basket, Category, Flow, SpendGroup
from contracts.dto.transactions import TransactionFilter, TransactionPage
from contracts.interfaces.controllers.errors import ValidationFailed

router = APIRouter()


@router.get("/transactions", response_model=TransactionPage)
def list_transactions(
    cid: CustomerId,
    svc: Annotated[Any, Depends(get_transaction_service)],
    from_date: date | None = None,
    to_date: date | None = None,
    basket: Basket | None = None,
    category: Category | None = None,
    spend_group: SpendGroup | None = None,
    flow: Flow | None = None,
    min_abs_amount_cents: Annotated[int | None, Query(ge=0)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Any:
    if from_date and to_date:
        if from_date > to_date:
            raise ValidationFailed("from_date must be on or before to_date.", [{"field": "from_date", "issue": "after to_date"}])
        if (to_date - from_date).days > 366:
            raise ValidationFailed("Date range must be at most 366 days.", [{"field": "to_date", "issue": "range > 366 days"}])
    flt = TransactionFilter(
        from_date=from_date, to_date=to_date, basket=basket, category=category,
        spend_group=spend_group, flow=flow, min_abs_amount_cents=min_abs_amount_cents,
    )
    return svc.list(cid, flt, page, page_size)
