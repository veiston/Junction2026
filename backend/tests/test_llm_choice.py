from __future__ import annotations

from adapters.llm.routing_llm import PrivacyRoutingLlm
from config import Config
from services.container import llm_for_chat

CLOUD = object()


def config(url: str) -> Config:
    return Config(ollama_base_url=url, ollama_api_key="k", ollama_model="m")


def test_gemini_is_the_default_even_when_a_local_model_is_configured():
    assert llm_for_chat(CLOUD, config("http://localhost:11434"), env={}) is CLOUD


def test_local_by_default_routes_figures_to_the_local_model():
    llm = llm_for_chat(CLOUD, config("http://localhost:11434"), env={"LOCAL_BY_DEFAULT": "1"})
    assert isinstance(llm, PrivacyRoutingLlm)


def test_without_a_local_model_the_flag_changes_nothing():
    assert llm_for_chat(CLOUD, config(""), env={"LOCAL_BY_DEFAULT": "1"}) is CLOUD
