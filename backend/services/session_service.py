"""SessionService: signed demo tokens (HS256 JWT, 60 min), identity and the demo clock."""
from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, timedelta, timezone

import jwt

from contracts.dto.session import AgeBand, DemoClock, Me, SessionToken
from contracts.interfaces.controllers.errors import (
    NotFound,
    TokenExpired,
    Unauthorized,
    ValidationFailed,
)
from contracts.interfaces.repositories.shared import Clock, CustomerRepository

AUDIENCE = "s-money-coach"
TOKEN_TTL = timedelta(minutes=60)
DATA_FROM = date(2024, 10, 1)
DATA_TO = date(2026, 9, 30)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SessionServiceImpl:
    def __init__(
        self,
        customers: CustomerRepository,
        clock: Clock,
        secret: str,
        now: Callable[[], datetime] = _utcnow,
    ) -> None:
        self._customers = customers
        self._clock = clock
        self._secret = secret
        self._now = now

    def create_demo_session(self, customer_id: str) -> SessionToken:
        if self._customers.get(customer_id) is None:
            raise NotFound("Customer not found.")
        issued = self._now()
        expires = issued + TOKEN_TTL
        token = jwt.encode(
            {"sub": customer_id, "aud": AUDIENCE, "iat": int(issued.timestamp()), "exp": int(expires.timestamp())},
            self._secret,
            algorithm="HS256",
        )
        return SessionToken(token=token, expires_at=expires)

    def verify_token(self, token: str) -> str:
        try:
            # exp is checked below against the injectable clock
            claims = jwt.decode(
                token,
                self._secret,
                algorithms=["HS256"],
                audience=AUDIENCE,
                options={"verify_exp": False, "require": ["sub", "exp", "aud"]},
            )
        except jwt.PyJWTError:
            raise Unauthorized("Invalid session token.") from None
        sub = claims.get("sub")
        if not isinstance(sub, str) or not isinstance(claims.get("exp"), (int, float)):
            raise Unauthorized("Invalid session token.")
        if self._now().timestamp() >= claims["exp"]:
            raise TokenExpired("Session token has expired.")
        return sub

    def me(self, customer_id: str) -> Me:
        c = self._customers.get(customer_id)
        if c is None:
            raise NotFound("Customer not found.")
        return Me(
            customer_id=c.customer_id,
            age=c.age,
            age_band=AgeBand(c.age_band),
            postal_code=c.postal_code,
            region=c.region,
            today=self._clock.today(),
            data_from=DATA_FROM,
            currency="EUR",
        )

    def get_clock(self) -> DemoClock:
        return DemoClock(today=self._clock.today())

    def set_clock(self, today: date) -> DemoClock:
        if not (DATA_FROM <= today <= DATA_TO):
            raise ValidationFailed(
                f"today must be within {DATA_FROM}..{DATA_TO}.",
                [{"field": "today", "issue": "outside the dataset range"}],
            )
        self._clock.set_today(today)
        return DemoClock(today=today)
