import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import pytest

from adapters.llm.fake_llm import FakeLlm
from adapters.llm.routing_llm import PrivacyRoutingLlm
from contracts.interfaces.controllers.errors import LlmUnavailable
from contracts.interfaces.llm.llm_client import LlmMessage, LlmTurn, ToolCall, ToolSpec

TOOL = ToolSpec("get_tx", "latest transactions", {"type": "object", "properties": {}})
CLOUD_TURN = LlmTurn("cloud", [], "stop")
LOCAL_TURN = LlmTurn("local", [], "stop")

SYSTEM = LlmMessage("system", "be brief")
USER = LlmMessage("user", "show")
OLD_ANSWER = LlmMessage("assistant", "you spent 500")
TOOL_CALL = LlmMessage("assistant", tool_calls=[ToolCall("1", "get_tx", {})])
TOOL_RESULT = LlmMessage("tool", "spent 500", tool_call_id="1", tool_name="get_tx")


def build():
    cloud, local = FakeLlm([CLOUD_TURN]), FakeLlm([LOCAL_TURN])
    return PrivacyRoutingLlm(cloud, local), cloud, local


def test_request_without_tool_message_goes_to_cloud():
    router, cloud, local = build()
    assert router.generate([SYSTEM, USER], [TOOL], force_tool="get_tx") is CLOUD_TURN
    assert cloud.calls[0]["tools"] == [TOOL]
    assert cloud.calls[0]["force_tool"] == "get_tx"
    assert local.calls == []


def test_cloud_gets_no_assistant_messages():
    router, cloud, _ = build()
    router.generate([SYSTEM, USER, OLD_ANSWER, TOOL_CALL, USER], [TOOL])
    assert cloud.calls[0]["messages"] == [SYSTEM, USER, USER]


def test_request_with_tool_message_goes_to_local():
    router, cloud, _ = build()
    assert router.generate([USER, TOOL_CALL, TOOL_RESULT], [TOOL]) is LOCAL_TURN
    assert cloud.calls == []


def test_local_gets_no_tools_and_full_history():
    router, _, local = build()
    messages = [USER, OLD_ANSWER, TOOL_CALL, TOOL_RESULT]
    router.generate(messages, [TOOL], force_tool="get_tx")
    assert local.calls[0]["tools"] == []
    assert local.calls[0]["force_tool"] is None
    assert local.calls[0]["messages"] == messages


def test_local_failure_does_not_fall_back_to_cloud():
    class DownLlm:
        def generate(self, *args, **kwargs):
            raise LlmUnavailable("down")

    cloud = FakeLlm([CLOUD_TURN])
    with pytest.raises(LlmUnavailable):
        PrivacyRoutingLlm(cloud, DownLlm()).generate([USER, TOOL_RESULT], [])
    assert cloud.calls == []
