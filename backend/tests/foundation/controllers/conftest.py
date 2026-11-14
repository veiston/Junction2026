"""Controller test harness: fake services via dependency overrides + a tiny ASGI client
(httpx is not a project dependency, so we call the ASGI app directly)."""

from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timezone
from urllib.parse import urlencode

import pytest

from api import dependencies as deps
from api.server import create_app
from config import Config
from contracts.dto.chat import AssistantMessage, ChatResponse
from contracts.dto.session import AgeBand, DemoClock, Me, SessionToken
from contracts.dto.transactions import TransactionPage
from contracts.interfaces.controllers.errors import NotFound, TokenExpired, Unauthorized, ValidationFailed

GOOD = "good-token"
EXPIRED = "expired-token"
CUSTOMER = "CUST00001"
NOW = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)


class FakeSessionService:
    def __init__(self) -> None:
        self.today = date(2026, 9, 15)

    def create_demo_session(self, customer_id):
        if customer_id != CUSTOMER:
            raise NotFound("Customer not found.")
        return SessionToken(token=GOOD, expires_at=NOW)

    def verify_token(self, token):
        if token == GOOD:
            return CUSTOMER
        if token == EXPIRED:
            raise TokenExpired("Token expired.")
        raise Unauthorized("Invalid token.")

    def me(self, customer_id):
        return Me(customer_id=customer_id, age=30, age_band=AgeBand.field_25_34, postal_code="00100",
                  region="Helsinki region", today=self.today, data_from=date(2024, 10, 1), currency="EUR")

    def get_clock(self):
        return DemoClock(today=self.today)

    def set_clock(self, today):
        if not date(2024, 10, 1) <= today <= date(2026, 9, 30):
            raise ValidationFailed("Date outside dataset range.", [{"field": "today", "issue": "out of range"}])
        self.today = today
        return DemoClock(today=today)


class FakeChatService:
    def __init__(self) -> None:
        self.calls: list = []

    def handle(self, customer_id, request):
        self.calls.append((customer_id, request))
        msg = AssistantMessage(id="m_1", role="assistant", created_at=NOW, text="hi", widgets=[],
                               suggestions=[], sources=[], disclaimer=None)
        return ChatResponse(conversation_id="c_1", message=msg)


class FakeTransactionService:
    def __init__(self) -> None:
        self.calls: list = []

    def list(self, customer_id, flt, page, page_size):
        self.calls.append((customer_id, flt, page, page_size))
        return TransactionPage(items=[], page=page, page_size=page_size, total=0, total_amount_cents=0)


class Client:
    def __init__(self, app, raise_errors: bool = True) -> None:
        self.app = app
        self.raise_errors = raise_errors

    def request(self, method, path, *, token=None, json_body=None, params=None, headers=None):
        raw_headers = [(b"host", b"test")]
        if token:
            raw_headers.append((b"authorization", f"Bearer {token}".encode()))
        for k, v in (headers or {}).items():
            raw_headers.append((k.lower().encode(), v.encode()))
        body = b""
        if json_body is not None:
            body = json.dumps(json_body).encode()
            raw_headers.append((b"content-type", b"application/json"))
        scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method,
                 "scheme": "http", "path": "/api/v1" + path, "raw_path": ("/api/v1" + path).encode(),
                 "query_string": urlencode(params or {}).encode(), "headers": raw_headers,
                 "client": ("test", 1), "server": ("test", 80), "root_path": ""}
        out = {"status": 0, "headers": {}, "body": b""}

        async def run():
            sent = False

            async def receive():
                nonlocal sent
                if not sent:
                    sent = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return {"type": "http.disconnect"}

            async def send(msg):
                if msg["type"] == "http.response.start":
                    out["status"] = msg["status"]
                    out["headers"] = {k.decode().lower(): v.decode() for k, v in msg["headers"]}
                elif msg["type"] == "http.response.body":
                    out["body"] += msg.get("body", b"")

            try:
                await self.app(scope, receive, send)
            except Exception:
                # ServerErrorMiddleware re-raises after sending the 500 response
                if self.raise_errors or not out["status"]:
                    raise

        asyncio.run(run())
        try:
            out["json"] = json.loads(out["body"])
        except ValueError:
            out["json"] = None
        return type("Resp", (), out)

    def get(self, path, **kw):
        return self.request("GET", path, **kw)

    def post(self, path, **kw):
        return self.request("POST", path, **kw)

    def put(self, path, **kw):
        return self.request("PUT", path, **kw)


@pytest.fixture
def services():
    return type("S", (), {"session": FakeSessionService(), "chat": FakeChatService(),
                          "tx": FakeTransactionService()})


def build_app(services, **cfg):
    app = create_app(Config(**cfg))
    app.dependency_overrides[deps.get_session_service] = lambda: services.session
    app.dependency_overrides[deps.get_chat_service] = lambda: services.chat
    app.dependency_overrides[deps.get_transaction_service] = lambda: services.tx
    return app


@pytest.fixture
def app(services):
    return build_app(services)


@pytest.fixture
def client(app):
    return Client(app)
