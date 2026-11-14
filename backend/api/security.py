"""Bearer token -> customer_id. The token is the ONLY source of customer_id."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Request

from api.dependencies import get_session_service
from contracts.interfaces.controllers.errors import Unauthorized


def customer_id(request: Request, sessions: Annotated[Any, Depends(get_session_service)]) -> str:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise Unauthorized("Missing or malformed Authorization header.")
    return sessions.verify_token(token.strip())  # raises Unauthorized / TokenExpired


CustomerId = Annotated[str, Depends(customer_id)]
