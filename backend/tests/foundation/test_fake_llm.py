import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import pytest

from adapters.llm.fake_llm import FakeLlm
from contracts.interfaces.llm.llm_client import LlmMessage, LlmTurn, ToolCall


def test_returns_turns_in_order_and_records_calls():
    t1 = LlmTurn("hi", [], "stop")
    t2 = LlmTurn("", [ToolCall("1", "x", {})], "tool_calls")
    fake = FakeLlm([t1])
    fake.push(t2)
    msgs = [LlmMessage("user", "q")]
    assert fake.generate(msgs, [], force_tool="x") is t1
    assert fake.generate(msgs, []) is t2
    assert fake.calls[0]["force_tool"] == "x"
    assert len(fake.calls) == 2


def test_exhausted_queue_fails_loudly():
    with pytest.raises(AssertionError):
        FakeLlm().generate([], [])
