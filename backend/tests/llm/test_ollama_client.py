import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import pytest

from adapters.llm.ollama_client import CONTEXT_LENGTH, OllamaClient
from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, ToolCall, ToolSpec

TOOL = ToolSpec("get_tx", "latest transactions", {"type": "object", "properties": {}})


class FakeOllama:
    def __init__(self, content="answer", exc=None):
        self.content, self.exc, self.kwargs = content, exc, None

    def chat(self, **kwargs):
        self.kwargs = kwargs
        if self.exc:
            raise self.exc
        return type("Response", (), {"message": type("Message", (), {"content": self.content})()})()


def generate(fake, messages=None, **kwargs):
    return OllamaClient(fake, "m").generate(messages or [LlmMessage("user", "hi")], [], **kwargs)


def test_text_turn():
    turn = generate(FakeOllama("hello"))
    assert (turn.text, turn.tool_calls, turn.finish_reason) == ("hello", [], "stop")


def test_passes_model_options_and_disables_thinking():
    fake = FakeOllama()
    generate(fake, temperature=0.7)
    assert fake.kwargs["model"] == "m"
    assert fake.kwargs["think"] is False
    assert fake.kwargs["options"] == {"temperature": 0.7, "num_ctx": CONTEXT_LENGTH}


def test_maps_messages_and_skips_assistant_tool_calls():
    fake = FakeOllama()
    messages = [
        LlmMessage("system", "be brief"),
        LlmMessage("user", "show"),
        LlmMessage("assistant", tool_calls=[ToolCall("1", "get_tx", {})]),
        LlmMessage("tool", "spent 500", tool_call_id="1", tool_name="get_tx"),
        LlmMessage("assistant", "earlier answer"),
    ]
    generate(fake, messages)
    assert fake.kwargs["messages"] == [
        {"role": "system", "content": "be brief"},
        {"role": "user", "content": "show"},
        {"role": "user", "content": "Facts from get_tx (amounts in euro cents): spent 500"},
        {"role": "assistant", "content": "earlier answer"},
    ]


def test_tools_and_force_tool_are_ignored():
    fake = FakeOllama()
    OllamaClient(fake, "m").generate([LlmMessage("user", "hi")], [TOOL], force_tool="get_tx")
    assert "tools" not in fake.kwargs


def test_client_error_becomes_llm_unavailable():
    with pytest.raises(LlmUnavailable):
        generate(FakeOllama(exc=ConnectionError("down")))


def test_empty_content_is_an_error_turn():
    turn = generate(FakeOllama(""))
    assert (turn.text, turn.tool_calls, turn.finish_reason) == ("", [], "error")


def test_from_config_sends_authorization_header_with_key():
    client = OllamaClient.from_config("http://localhost:11434", "secret", "m")
    assert client._client._client.headers["authorization"] == "Bearer secret"


def test_from_config_sends_no_authorization_header_without_key():
    client = OllamaClient.from_config("http://localhost:11434", "", "m")
    assert "authorization" not in client._client._client.headers
