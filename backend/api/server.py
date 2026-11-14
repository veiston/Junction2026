"""App factory: CORS, security headers, request id, error envelope."""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.routes import mount_routes
from config import Config
from contracts.interfaces.controllers.errors import AppError

log = logging.getLogger("api")

_SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
}


def _envelope(request: Request, status: int, code: str, message: str, details: list | None = None) -> JSONResponse:
    rid = getattr(request.state, "request_id", "r_unknown")
    body = {"error": {"code": code, "message": message, "details": details or [], "request_id": rid}}
    return JSONResponse(body, status_code=status, headers={"X-Request-ID": rid})


def create_app(config: Config | None = None) -> FastAPI:
    config = config or Config.from_env()
    app = FastAPI(title="S-Money Coach API", version="1.0.0")
    app.state.config = config

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[config.coach_origin, config.demo_origin],
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = "r_" + uuid.uuid4().hex[:8]
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        for k, v in _SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        log.info("%s %s -> %s [%s]", request.method, request.url.path, response.status_code, rid)
        return response

    @app.exception_handler(AppError)
    async def on_app_error(request: Request, exc: AppError):
        if exc.http_status >= 500 and exc.http_status != 501 and exc.http_status != 502:
            log.exception("internal error [%s]", request.state.request_id)
        return _envelope(request, exc.http_status, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def on_validation(request: Request, exc: RequestValidationError):
        details = [
            {"field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "issue": e["msg"]}
            for e in exc.errors()
        ]
        return _envelope(request, 400, "VALIDATION_ERROR", "Request validation failed.", details)

    @app.exception_handler(StarletteHTTPException)
    async def on_http(request: Request, exc: StarletteHTTPException):
        code = {404: "NOT_FOUND", 405: "VALIDATION_ERROR"}.get(exc.status_code, "INTERNAL_ERROR")
        status = 400 if exc.status_code == 405 else exc.status_code
        return _envelope(request, status, code, "Resource not found." if status == 404 else "Request not allowed.")

    @app.exception_handler(Exception)
    async def on_unhandled(request: Request, exc: Exception):
        log.exception("unhandled error [%s]", getattr(request.state, "request_id", "?"))
        return _envelope(request, 500, "INTERNAL_ERROR", "Something went wrong.")

    mount_routes(app)
    return app
