"""E2E harness: the real FastAPI app + real services + a real SQLite DB built by the real ingest.
Only the LLM is swapped (FakeLlm), or the real Gemini client in the live test."""

from __future__ import annotations

import pytest

from adapters.llm.fake_llm import FakeLlm
from api import dependencies as deps
from api.server import create_app
from config import Config
from services.container import build_services
from tests.foundation._world import write_csvs
from tests.foundation.controllers.conftest import Client

from models.database import Database
from services.ingest_service import ingest_dataset

CUSTOMER = "CUST00001"


@pytest.fixture
def db_path(tmp_path):
    db = Database(tmp_path / "e2e.sqlite3")
    ingest_dataset(db, write_csvs(tmp_path / "data"))
    return db.path


def make_client(db_path, llm, **cfg):
    config = Config(db_path=str(db_path), jwt_secret="e2e-secret", **cfg)
    services = build_services(config, llm=llm)
    app = create_app(config)
    app.dependency_overrides[deps.get_session_service] = lambda: services.session
    app.dependency_overrides[deps.get_chat_service] = lambda: services.chat
    app.dependency_overrides[deps.get_transaction_service] = lambda: services.transactions
    return Client(app)


@pytest.fixture
def llm():
    return FakeLlm()


@pytest.fixture
def client(db_path, llm):
    return make_client(db_path, llm)


@pytest.fixture
def token(client):
    resp = client.post("/demo/session", json_body={"customer_id": CUSTOMER})
    assert resp.status == 201
    return resp.json["token"]
