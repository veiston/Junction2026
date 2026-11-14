"""With a local model switched on (Ollama or LiteRT), typed questions get data too: the cloud model picks the
tool from the question alone and the local model writes the answer from the facts."""
from __future__ import annotations

from adapters.llm.fake_llm import FakeLlm
from contracts.dto.chat import ChatRequest
from contracts.interfaces.llm.llm_client import LlmTurn, ToolCall
from services.chat.orchestrator import ChatOrchestrator
from services.chat.tool_registry import default_registry
from services.transaction_service import TransactionServiceImpl
from tests.fakes import fixture_world

CID = "CUST00001"


def test_typed_question_with_a_local_model_still_uses_tools():
    clock, _, txs, _, convs = fixture_world()
    cloud, local = FakeLlm(), FakeLlm()
    orch = ChatOrchestrator(cloud, default_registry(TransactionServiceImpl(txs, clock)), convs, clock)
    cloud.push(LlmTurn("", [ToolCall("t1", "list_transactions", {})], "tool_calls"))
    local.push(LlmTurn("Here are your latest purchases.", [], "stop"))

    r = orch.handle(CID, ChatRequest(message="show my latest transactions"), llm_override=local)

    assert [w.type.value for w in r.message.widgets] == ["transaction_list"]
    assert r.message.text == "Here are your latest purchases."
    # the cloud model picked the tool and never saw the money facts; the local model wrote the answer
    assert len(cloud.calls) == 1 and not any(m.role == "tool" for m in cloud.calls[0]["messages"])
    assert any(m.role == "tool" for m in local.calls[0]["messages"])
    assert local.calls[0]["tools"] == []
