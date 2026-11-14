"""Notices behind the bell. customer_id comes only from the token."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Response

from api.dependencies import get_notification_service
from api.security import CustomerId
from contracts.dto.notifications import NotificationList

router = APIRouter()
Notifications = Annotated[Any, Depends(get_notification_service)]


@router.get("/notifications", response_model=NotificationList)
def list_notifications(cid: CustomerId, svc: Notifications) -> Any:
    return svc.unread(cid)


@router.post("/notifications/{notification_id}/read", status_code=204, response_class=Response)
def mark_notification_read(
    cid: CustomerId,
    svc: Notifications,
    notification_id: Annotated[str, Path(pattern=r"^[a-z0-9_-]+$")],
) -> Response:
    svc.mark_read(cid, notification_id)
    return Response(status_code=204)
