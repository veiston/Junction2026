"""LiteRtClient with a fake engine: no model file or GPU needed."""
import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root
    sys.path.insert(0, str(p))

import pytest

from adapters.llm.litert_client import MAX_OUTPUT_TOKENS, LiteRtClient
from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, ToolCall, ToolSpec

TOOL = ToolSpec("get_tx", "latest transactions", {"type": "object", "properties": {}})


class FakeConversation:
    def __init__(self, engine):
        self.engine = engine

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.engine.closed += 1

    def send_message(self, text):
        self.engine.sent.append(text)
        if self.engine.exc:
            raise self.engine.exc
        return {"role": "assistant", "content": [{"type": "text", "text": self.engine.reply}]}


class FakeEngine:
    def __init__(self, reply="answer", exc=None):
        self.reply, self.exc = reply, exc
        self.kwargs, self.sent, self.closed = None, [], 0

    def create_conversation(self, **kwargs):
        self.kwargs = kwargs
        return FakeConversation(self)


def generate(engine, messages=None, tools=(), **kwargs):
    return LiteRtClient(engine).generate(messages or [LlmMessage("user", "hi")], list(tools), **kwargs)


def test_text_turn():
    turn = generate(FakeEngine("hello"))
    assert (turn.text, turn.tool_calls, turn.finish_reason) == ("hello", [], "stop")


def test_history_seeds_the_conversation_and_the_last_user_text_is_sent():
    engine = FakeEngine()
    generate(engine, [
        LlmMessage("system", "be kind"),
        LlmMessage("user", "q1"),
        LlmMessage("assistant", "a1"),
        LlmMessage("user", "q2"),
    ])
    assert engine.kwargs["messages"] == [
        {"role": "system", "content": [{"type": "text", "text": "be kind"}]},
        {"role": "user", "content": [{"type": "text", "text": "q1"}]},
        {"role": "assistant", "content": [{"type": "text", "text": "a1"}]},
    ]
    assert engine.sent == ["q2"]
    assert engine.closed == 1  # the conversation is released after each answer


def test_tool_facts_become_the_text_to_answer_and_tool_only_turns_are_dropped():
    engine = FakeEngine()
    generate(engine, [
        LlmMessage("user", "how much on taxis?"),
        LlmMessage("assistant", "", tool_calls=[ToolCall("t1", "get_spending", {})]),
        LlmMessage("tool", '{"amount_cents": 4615}', tool_call_id="t1", tool_name="get_spending"),
    ])
    assert [m["role"] for m in engine.kwargs["messages"]] == ["user"]
    assert engine.sent == ['Facts from get_spending (amounts in euro cents): {"amount_cents": 4615}']


def test_tools_are_never_given_to_the_local_model():
    engine = FakeEngine()
    turn = generate(engine, tools=[TOOL], force_tool="get_tx")
    assert "tools" not in engine.kwargs and engine.kwargs["automatic_tool_calling"] is False
    assert engine.kwargs["max_output_tokens"] == MAX_OUTPUT_TOKENS
    assert turn.tool_calls == []


def test_empty_reply_is_an_error_turn():
    assert generate(FakeEngine("  ")).finish_reason == "error"


def test_engine_failure_is_llm_unavailable():
    with pytest.raises(LlmUnavailable, match="LiteRT failed"):
        generate(FakeEngine(exc=RuntimeError("out of memory")))


def test_nothing_to_answer_is_llm_unavailable():
    with pytest.raises(LlmUnavailable):
        generate(FakeEngine(), [LlmMessage("system", "only rules")])


@pytest.mark.parametrize("path,backend,match", [
    ("", "cpu", "not set"),
    ("does/not/exist.litertlm", "cpu", "not found"),
])
def test_from_config_explains_what_is_missing(path, backend, match):
    with pytest.raises(LlmUnavailable, match=match):
        LiteRtClient.from_config(path, backend)


def test_from_config_rejects_an_unknown_backend(tmp_path):
    model = tmp_path / "m.litertlm"
    model.write_bytes(b"x")
    with pytest.raises(LlmUnavailable, match="LITERT_BACKEND"):
        LiteRtClient.from_config(str(model), "tpu")


def test_from_config_reports_a_broken_model_file(tmp_path):
    model = tmp_path / "broken.litertlm"
    model.write_bytes(b"not a model")
    with pytest.raises(LlmUnavailable, match="could not load"):
        LiteRtClient.from_config(str(model), "cpu")
