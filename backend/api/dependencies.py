"""Wiring: builds real services from config. Tests override these with app.dependency_overrides."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from fastapi import Request

from config import Config
from contracts.interfaces.controllers.errors import NotImplementedYet


def get_config(request: Request) -> Config:
    return request.app.state.config


@lru_cache(maxsize=1)
def _build_container(config: Config) -> Any:
    """Real services are built by foundation-services (`services.container.build_services`)."""
    try:
        from services.container import build_services  # type: ignore[import-not-found]
    except ImportError as exc:
        raise NotImplementedYet("Services are not wired yet.") from exc
    return build_services(config)


def _container(request: Request) -> Any:
    return _build_container(request.app.state.config)


def get_session_service(request: Request) -> Any:
    return _container(request).session


def get_chat_service(request: Request) -> Any:
    return _container(request).chat


def get_transaction_service(request: Request) -> Any:
    return _container(request).transactions
