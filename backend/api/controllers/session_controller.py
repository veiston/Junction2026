from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request

from api.dependencies import get_config, get_session_service
from api.security import CustomerId
from config import Config
from contracts.dto.session import DemoClock, DemoClockRequest, DemoSessionRequest, Me, SessionToken
from contracts.interfaces.controllers.errors import Forbidden

router = APIRouter()

Sessions = Annotated[Any, Depends(get_session_service)]


def _require_demo(config: Config) -> None:
    if not config.demo_mode:
        raise Forbidden("Demo endpoints are disabled.")


@router.post("/demo/session", status_code=201, response_model=SessionToken)
def create_demo_session(
    body: DemoSessionRequest, sessions: Sessions, config: Annotated[Config, Depends(get_config)]
) -> Any:
    _require_demo(config)
    return sessions.create_demo_session(body.customer_id)


@router.get("/demo/clock", response_model=DemoClock)
def get_clock(_: CustomerId, sessions: Sessions) -> Any:
    return sessions.get_clock()


@router.put("/demo/clock", response_model=DemoClock)
def set_clock(
    body: DemoClockRequest,
    _: CustomerId,
    sessions: Sessions,
    config: Annotated[Config, Depends(get_config)],
) -> Any:
    _require_demo(config)
    return sessions.set_clock(body.today)


@router.get("/me", response_model=Me)
def me(cid: CustomerId, sessions: Sessions) -> Any:
    return sessions.me(cid)
