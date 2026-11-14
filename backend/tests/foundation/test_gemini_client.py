import os
import sys
from pathlib import Path
from types import SimpleNamespace as NS

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import pytest
from google.genai import errors as genai_errors

from adapters.llm.gemini_client import GeminiClient
from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, ToolCall, ToolSpec

TOOL = ToolSpec("get_tx", "latest transactions", {"type": "object", "properties": {"n": {"type": "integer"}}})


class FakeSdk:
    def __init__(self, response=None, exc=None):
        self.response, self.exc, self.kwargs = response, exc, None
        self.models = self

    def generate_content(self, **kwargs):
        self.kwargs = kwargs
        if self.exc:
            raise self.exc
        return self.response


def resp(parts, reason="STOP"):
    return NS(candidates=[NS(content=NS(parts=parts), finish_reason=NS(name=reason))], prompt_feedback=None)


def text(t):
    return NS(text=t, function_call=None, thought=False)


def call(name, args, id=None):
    return NS(text=None, function_call=NS(id=id, name=name, args=args), thought=False)


def test_text_turn():
    sdk = FakeSdk(resp([text("hello")]))
    turn = GeminiClient(sdk, model="m").generate([LlmMessage("user", "hi")], [])
    assert (turn.text, turn.tool_calls, turn.finish_reason) == ("hello", [], "stop")
    assert sdk.kwargs["model"] == "m"
    assert sdk.kwargs["config"].tools is None


def test_tool_call_turn_and_message_mapping():
    sdk = FakeSdk(resp([call("get_tx", {"n": 3}, id="abc")]))
    msgs = [
        LlmMessage("system", "be brief"),
        LlmMessage("user", "show"),
        LlmMessage("assistant", tool_calls=[ToolCall("abc", "get_tx", {"n": 3})]),
        LlmMessage("tool", "facts", tool_call_id="abc", tool_name="get_tx"),
    ]
    turn = GeminiClient(sdk).generate(msgs, [TOOL])
    assert turn.finish_reason == "tool_calls"
    assert turn.tool_calls == [ToolCall("abc", "get_tx", {"n": 3})]
    cfg = sdk.kwargs["config"]
    assert cfg.system_instruction == "be brief"
    assert cfg.tools[0].function_declarations[0].name == "get_tx"
    roles = [c.role for c in sdk.kwargs["contents"]]
    assert roles == ["user", "model", "user"]
    assert sdk.kwargs["contents"][2].parts[0].function_response.name == "get_tx"


def test_missing_call_id_is_generated():
    turn = GeminiClient(FakeSdk(resp([call("get_tx", {})]))).generate([LlmMessage("user", "x")], [TOOL])
    assert turn.tool_calls[0].id


def test_force_tool():
    sdk = FakeSdk(resp([call("get_tx", {})]))
    GeminiClient(sdk).generate([LlmMessage("user", "x")], [TOOL], force_tool="get_tx", timeout_s=5)
    fcc = sdk.kwargs["config"].tool_config.function_calling_config
    assert fcc.mode.name == "ANY"
    assert fcc.allowed_function_names == ["get_tx"]
    assert sdk.kwargs["config"].http_options.timeout == 5000


def test_force_tool_unknown_name_rejected():
    with pytest.raises(ValueError):
        GeminiClient(FakeSdk()).generate([LlmMessage("user", "x")], [TOOL], force_tool="nope")


def test_safety_and_length():
    assert GeminiClient(FakeSdk(resp([], "SAFETY"))).generate([], []).finish_reason == "safety"
    blocked = NS(candidates=[], prompt_feedback=NS(block_reason="SAFETY"))
    assert GeminiClient(FakeSdk(blocked)).generate([], []).finish_reason == "safety"
    assert GeminiClient(FakeSdk(resp([text("x")], "MAX_TOKENS"))).generate([], []).finish_reason == "length"


@pytest.mark.parametrize(
    "exc",
    [
        genai_errors.ServerError(503, {"error": {"message": "overloaded"}}),
        genai_errors.ClientError(429, {"error": {"message": "quota"}}),
        TimeoutError("timed out"),
        ConnectionError("down"),
    ],
)
def test_errors_become_llm_unavailable(exc):
    with pytest.raises(LlmUnavailable):
        GeminiClient(FakeSdk(exc=exc)).generate([LlmMessage("user", "x")], [])


@pytest.mark.live
@pytest.mark.skipif(not os.environ.get("GEMINI_API_KEY"), reason="GEMINI_API_KEY not set")
def test_live_smoke():
    turn = GeminiClient().generate([LlmMessage("user", "Say OK")], [], timeout_s=30)
    assert turn.finish_reason in ("stop", "length")
    assert turn.text
