"""Gemini 3 needs the function call's thought_signature echoed back in the next request."""
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]

from adapters.llm.gemini_client import GeminiClient, _pack_id, _unpack_id  # noqa: E402
from contracts.interfaces.llm.llm_client import LlmMessage, ToolCall  # noqa: E402


def _response(signature):
    part = SimpleNamespace(
        function_call=SimpleNamespace(id="call_1", name="list_transactions", args={"limit": 5}),
        thought_signature=signature,
        text=None,
        thought=False,
    )
    cand = SimpleNamespace(content=SimpleNamespace(parts=[part]), finish_reason=None)
    return SimpleNamespace(candidates=[cand], prompt_feedback=None)


def test_pack_and_unpack_round_trip():
    packed = _pack_id("call_1", b"\x00\x01sig")
    assert packed != "call_1"
    assert _unpack_id(packed) == ("call_1", b"\x00\x01sig")


def test_id_without_signature_is_unchanged():
    assert _pack_id("call_1", None) == "call_1"
    assert _unpack_id("call_1") == ("call_1", None)


def test_signature_from_response_is_sent_back_with_the_call_and_not_with_the_response():
    turn = GeminiClient._to_turn(_response(b"secret-signature"))
    call = turn.tool_calls[0]
    assert turn.finish_reason == "tool_calls"

    messages = [
        LlmMessage(role="user", text="latest transactions"),
        LlmMessage(role="assistant", tool_calls=[call]),
        LlmMessage(role="tool", text="{}", tool_call_id=call.id, tool_name=call.name),
    ]
    _, contents = GeminiClient._contents(messages)

    fc_part = contents[1].parts[0]
    assert fc_part.thought_signature == b"secret-signature"
    assert fc_part.function_call.id == "call_1"
    assert contents[2].parts[0].function_response.id == "call_1"


def test_response_without_signature_still_works():
    turn = GeminiClient._to_turn(_response(None))
    assert turn.tool_calls == [ToolCall(id="call_1", name="list_transactions", arguments={"limit": 5})]
