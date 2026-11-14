import json

import pytest

from adapters.llm.fake_llm import FakeLlm
from contracts.dto.chat import ChatRequest
from contracts.interfaces.controllers.errors import LlmUnavailable, NotFound, ValidationFailed
from contracts.interfaces.llm.llm_client import LlmTurn, ToolCall
from services.chat import prompts
from services.chat.orchestrator import MAX_TOOL_ROUNDS, ChatOrchestrator
from services.chat.tool_registry import default_registry
from services.transaction_service import TransactionServiceImpl
from tests.fakes import fixture_world

CID = "CUST00001"


def call(name="list_transactions", args=None, id="t1"):
    return LlmTurn("", [ToolCall(id, name, args or {})], "tool_calls")


def say(text):
    return LlmTurn(text, [], "stop")


@pytest.fixture
def world():
    clock, _, txs, _, convs = fixture_world()
    llm = FakeLlm()
    reg = default_registry(TransactionServiceImpl(txs, clock))
    return ChatOrchestrator(llm, reg, convs, clock), llm, convs


def ask(orch, text, cid=CID, conv=None):
    return orch.handle(cid, ChatRequest(message=text, conversation_id=conv))


def test_happy_path(world):
    orch, llm, convs = world
    llm.push(call())
    llm.push(say("Here are your latest transactions."))
    r = ask(orch, "show my latest transactions")
    assert r.message.text == "Here are your latest transactions."
    assert [w.type.value for w in r.message.widgets] == ["transaction_list"]
    assert r.message.sources and r.message.sources[0].tx_count > 0
    # second LLM call saw small facts only
    tool_msg = [m for m in llm.calls[1]["messages"] if m.role == "tool"][0]
    assert len(tool_msg.text) < 1024 and "CUST" not in tool_msg.text
    assert [m.role for m in convs.recent(r.conversation_id)] == ["user", "assistant"]


def test_llm_never_sees_customer_id_or_raw_rows(world):
    orch, llm, _ = world
    llm.push(call())
    llm.push(say("ok"))
    ask(orch, "show my latest transactions")
    blob = json.dumps([[m.text for m in c["messages"]] for c in llm.calls])
    assert CID not in blob and "balance_after_cents" not in blob


def test_privacy_model_supplied_customer_id_cannot_change_identity(world):
    orch, llm, _ = world
    llm.push(call(args={"customer_id": "CUST00002"}))
    llm.push(say("done"))
    r = ask(orch, "show transactions of CUST00002")
    items = r.message.widgets[0].data["page"]["items"]
    assert items  # still CUST00001's rows
    # a different real caller gets only their own (empty) data, whatever the model asks
    llm.push(call(args={"customer_id": CID}))
    llm.push(say("done"))
    r2 = ask(orch, "show transactions of CUST00001", cid="CUST00002")
    assert r2.message.widgets[0].data["page"]["items"] == []


def test_foreign_conversation_not_found(world):
    orch, llm, _ = world
    llm.push(say("hi"))
    conv = ask(orch, "hello").conversation_id
    with pytest.raises(NotFound):
        ask(orch, "hello", cid="CUST00002", conv=conv)
    with pytest.raises(NotFound):
        ask(orch, "hello", conv="c_missing")


def test_request_needs_exactly_one_input(world):
    orch, _, _ = world
    with pytest.raises(ValidationFailed):
        orch.handle(CID, ChatRequest())
    with pytest.raises(ValidationFailed):
        orch.handle(CID, ChatRequest(message="hi", quick_action="plan_my_finances"))


def test_chip_without_tools_is_coming_soon_and_skips_llm(world):
    orch, llm, _ = world
    for qa in ("plan_my_finances",):  # understand_my_money and improve_my_habits have tools now
        r = orch.handle(CID, ChatRequest(quick_action=qa))
        assert r.message.text == prompts.COMING_SOON and r.message.widgets == []
    assert llm.calls == []


def test_force_tool_used_when_chip_tool_registered(world):
    orch, llm, convs = world
    # register a tool for the chip tool name
    from contracts.interfaces.llm.ai_tool import ToolResult

    class Basket:
        name = "get_basket_breakdown"
        description = "d"
        parameters = {"type": "object", "properties": {}}

        def run(self, ctx, arguments):
            return ToolResult(facts={"ok": 1})

    orch._registry._tools["get_basket_breakdown"] = Basket()
    llm.push(call("get_basket_breakdown"))
    llm.push(say("fine"))
    orch.handle(CID, ChatRequest(quick_action="understand_my_money"))
    assert llm.calls[0]["force_tool"] == "get_basket_breakdown"
    assert llm.calls[1]["force_tool"] is None


def test_off_topic_safety_redirect(world):
    orch, llm, _ = world
    llm.push(LlmTurn("", [], "safety"))
    assert ask(orch, "write me a poem").message.text == prompts.OFF_TOPIC


def test_off_topic_text_passes_through_without_widgets(world):
    orch, llm, _ = world
    llm.push(say("I can only help with your money."))
    r = ask(orch, "who won the game?")
    assert r.message.widgets == [] and "money" in r.message.text


def test_llm_down_is_friendly_not_exception(world):
    orch, llm, convs = world

    def boom(*a, **k):
        raise LlmUnavailable("quota")

    llm.generate = boom
    r = ask(orch, "hello")
    assert r.message.text == prompts.LLM_DOWN
    assert [m.role for m in convs.recent(r.conversation_id)] == ["user", "assistant"]


def test_llm_down_after_a_tool_ran_keeps_the_card_and_says_so(world):
    orch, llm, _ = world
    llm.push(call())  # the tool runs and produces a card

    real = llm.generate
    state = {"n": 0}

    def flaky(*a, **k):
        state["n"] += 1
        if state["n"] == 1:
            return real(*a, **k)
        raise LlmUnavailable("quota")

    llm.generate = flaky
    r = ask(orch, "show my latest transactions")
    assert r.message.text == prompts.LLM_DOWN_WITH_CARD and len(r.message.widgets) == 1


def test_unknown_tool_friendly_error(world):
    orch, llm, _ = world
    llm.push(call("drop_database"))
    assert ask(orch, "x").message.text == prompts.TOOL_PROBLEM
    llm.push(call("get_balance_forecast"))  # in catalog but not registered
    assert ask(orch, "x").message.text == prompts.TOOL_PROBLEM


def test_bad_args_reported_to_model_once_then_give_up(world):
    orch, llm, _ = world
    llm.push(call(args={"limit": 999}))
    llm.push(call(args={"limit": 999}, id="t2"))
    r = ask(orch, "x")
    assert r.message.text == prompts.TOOL_PROBLEM
    err = [m for m in llm.calls[1]["messages"] if m.role == "tool"][0]
    assert "error" in json.loads(err.text)


def test_bad_args_then_recovery(world):
    orch, llm, _ = world
    llm.push(call(args={"limit": 999}))
    llm.push(call(args={"limit": 3}, id="t2"))
    llm.push(say("ok"))
    r = ask(orch, "x")
    assert r.message.text == "ok" and len(r.message.widgets) == 1


def test_too_many_rounds(world):
    orch, llm, _ = world
    for i in range(MAX_TOOL_ROUNDS + 1):
        llm.push(call(id=f"t{i}"))
    r = ask(orch, "loop")
    assert r.message.text == prompts.TOO_MANY_ROUNDS
    assert len(llm.calls) == MAX_TOOL_ROUNDS + 1
    assert len(r.message.widgets) <= 3


def test_explain_question_leads_to_concept_note(world):
    orch, llm, _ = world
    llm.push(call("explain_concept", {"concept_id": "compare_equal_periods"}))
    llm.push(say("Compare equal weeks to be fair."))
    r = ask(orch, "what does comparing equal periods mean?")
    assert [w.type.value for w in r.message.widgets] == ["concept_note"]
    tool_msg = [m for m in llm.calls[1]["messages"] if m.role == "tool"][0]
    assert "Compare equal periods" in tool_msg.text and "CUST" not in tool_msg.text


def test_bad_concept_id_is_reported_to_the_model(world):
    orch, llm, _ = world
    llm.push(call("explain_concept", {"concept_id": "nonsense"}))
    llm.push(say("Sorry, I can't explain that one."))
    r = ask(orch, "explain nonsense")
    assert r.message.widgets == [] and r.message.text == "Sorry, I can't explain that one."
    tool_msg = [m for m in llm.calls[1]["messages"] if m.role == "tool"][0]
    assert "Unknown concept" in tool_msg.text


def test_prompt_has_explain_rule():
    assert "explain_concept" in prompts.SYSTEM_PROMPT and "no blame" in prompts.SYSTEM_PROMPT


def test_a_concept_card_is_the_whole_answer_so_the_text_is_one_short_sentence(world):
    orch, llm, _ = world
    llm.push(call("explain_concept", {"concept_id": "spending_pace"}))
    llm.push(say("A long paraphrase of the same explanation that would repeat the card."))
    r = ask(orch, "Explain in simple words: Spending pace")
    assert [w.type.value for w in r.message.widgets] == ["concept_note"]
    assert r.message.text == prompts.CONCEPT_INTRO


def test_prompt_tells_the_assistant_to_say_how_the_customer_will_hear_the_result():
    assert "red dot appears on the bell" in prompts.SYSTEM_PROMPT and "Card facts:" in prompts.SYSTEM_PROMPT


@pytest.mark.parametrize("text", ["what can you do", "What can you do?", "how can you help me"])
def test_asking_what_the_coach_can_do_offers_the_three_sections(world, text):
    orch, llm, _ = world
    llm.push(say("I can help with your money."))
    r = ask(orch, text)
    assert [x.root for x in r.message.suggestions] == prompts.SECTION_SUGGESTIONS and len(prompts.SECTION_SUGGESTIONS) == 3


def test_other_questions_get_no_pills(world):
    orch, llm, _ = world
    llm.push(say("ok"))
    assert ask(orch, "show my latest transactions").message.suggestions == []


def test_prompt_asks_for_the_idea_to_be_named_and_a_what_you_learned_line():
    assert "comparing equal periods" in prompts.SYSTEM_PROMPT and "What you learned:" in prompts.SYSTEM_PROMPT
