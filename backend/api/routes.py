from __future__ import annotations

from fastapi import FastAPI

from api.controllers import (
    chat_controller, habits_controller, health_controller, notifications_controller, plan_controller,
    session_controller, transactions_controller, understand_controller, voice_controller,
)

API_PREFIX = "/api/v1"


def mount_routes(app: FastAPI) -> None:
    for module in (
        health_controller, session_controller, chat_controller, transactions_controller,
        understand_controller, plan_controller, habits_controller, voice_controller, notifications_controller,
    ):
        app.include_router(module.router, prefix=API_PREFIX)
