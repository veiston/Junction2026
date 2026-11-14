from __future__ import annotations

import pytest

from api import dependencies as deps
from api.server import create_app
from config import Config
from tests.foundation.controllers.conftest import Client, FakeSessionService
from tests.habits.world import make_world


@pytest.fixture
def http():
    """App with the real habits service on fake repositories; session service is the foundation fake."""
    svc, clock, limits, challenges = make_world()
    session = FakeSessionService()
    app = create_app(Config())
    app.dependency_overrides[deps.get_session_service] = lambda: session
    app.dependency_overrides[deps.get_habits_service] = lambda: svc
    return type("H", (), {"client": Client(app), "clock": clock, "limits": limits, "challenges": challenges})
