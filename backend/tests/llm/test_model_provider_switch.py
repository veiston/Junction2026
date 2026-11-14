"""The X-Model-Provider header picks the model for one chat turn: none = Gemini, local = Ollama, litert = LiteRT."""
from __future__ import annotations

import pytest

from adapters.llm.litert_client import LiteRtClient
from adapters.llm.ollama_client import OllamaClient
from config import Config
from tests.foundation.controllers.conftest import GOOD, Client, FakeSessionService, FakeTransactionService, build_app


class RecordingChat:
    def __init__(self) -> None:
        self.overrides: list = []

    def handle(self, customer_id, request, llm_override=None):
        from tests.foundation.controllers.conftest import FakeChatService

        self.overrides.append(llm_override)
        return FakeChatService().handle(customer_id, request)


@pytest.fixture
def chat():
    return RecordingChat()


def client_for(chat, **cfg):
    services = type("S", (), {"session": FakeSessionService(), "chat": chat, "tx": FakeTransactionService()})
    return Client(build_app(services, **cfg))


def post(client, provider=None):
    headers = {"X-Model-Provider": provider} if provider else None
    return client.post("/chat", token=GOOD, json_body={"message": "hi"}, headers=headers)


def test_no_header_means_the_default_cloud_model(chat):
    assert post(client_for(chat)).status == 200
    assert chat.overrides == [None]


def test_local_still_means_ollama(chat, monkeypatch):
    monkeypatch.setattr(OllamaClient, "from_config", classmethod(lambda cls, *a: "ollama-client"))
    assert post(client_for(chat), "local").status == 200
    assert chat.overrides == ["ollama-client"]


def test_litert_uses_the_configured_model_path_and_backend(chat, monkeypatch, tmp_path):
    seen = {}
    monkeypatch.setattr(LiteRtClient, "from_config",
                        classmethod(lambda cls, path, backend: seen.update(path=path, backend=backend) or "litert-client"))
    model = tmp_path / "gemma.litertlm"
    assert post(client_for(chat, litert_model_path=str(model), litert_backend="gpu"), "litert").status == 200
    assert chat.overrides == ["litert-client"]
    assert seen == {"path": str(model), "backend": "gpu"}


def test_relative_model_paths_start_at_the_project_root(chat, monkeypatch):
    from models.database import PROJECT_ROOT

    seen = {}
    monkeypatch.setattr(LiteRtClient, "from_config", classmethod(lambda cls, path, backend: seen.update(path=path)))
    post(client_for(chat, litert_model_path="models/litert/x.litertlm"), "litert")
    assert seen["path"] == str(PROJECT_ROOT / "models/litert/x.litertlm")


def test_missing_litert_model_answers_friendly_instead_of_failing(chat):
    resp = post(client_for(chat, litert_model_path="nope/missing.litertlm"), "litert")
    assert resp.status == 200
    override = chat.overrides[0]
    with pytest.raises(Exception, match="not found"):
        override.generate([], [])


def test_env_names_for_litert():
    cfg = Config.from_env({"LITERT_MODEL_PATH": "m.litertlm", "LITERT_BACKEND": " GPU "})
    assert (cfg.litert_model_path, cfg.litert_backend) == ("m.litertlm", "gpu")
    assert Config.from_env({}).litert_backend == "cpu"
