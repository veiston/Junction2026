import json
from datetime import date

import pytest

from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import ToolContext
from services.chat.foundation_tools import ListTransactionsTool
from services.chat.tool_registry import ToolRegistry, UnknownTool, default_registry
from services.transaction_service import TransactionServiceImpl
from tests.fakes import fixture_world

CTX = ToolContext(customer_id="CUST00001", today=date(2026, 9, 15), conversation_id="c_1")


@pytest.fixture
def svc():
    clock, _, txs, _, _ = fixture_world()
    return TransactionServiceImpl(txs, clock)


def test_list_transactions_widget_and_small_facts(svc):
    r = ListTransactionsTool(svc).run(CTX, {})
    assert len(r.widgets) == 1 and r.widgets[0].type.value == "transaction_list"
    assert len(r.widgets[0].data["page"]["items"]) == 5
    assert len(json.dumps(r.facts)) < 1024
    assert "CUST" not in json.dumps(r.facts)
    assert r.sources[0].tx_count == r.facts["matching_count"]
    assert r.facts["latest"]["date"] == "2026-09-15"


@pytest.mark.parametrize("args", [{"limit": 0}, {"limit": 21}, {"from_date": "nope"}, {"basket": "x"}, {"bogus": 1}])
def test_bad_args(svc, args):
    with pytest.raises(ValidationFailed):
        ListTransactionsTool(svc).run(CTX, args)


def test_registry_rejects_names_outside_catalog(svc):
    class Rogue:
        name = "drop_tables"
        description = ""
        parameters = {}

    with pytest.raises(ValueError):
        ToolRegistry([Rogue()])


def test_registry_unknown_call_and_customer_id_stripped(svc):
    reg = default_registry(svc)
    assert reg.has("list_transactions") and "list_transactions" in [s.name for s in reg.specs()]
    with pytest.raises(UnknownTool):
        reg.run(CTX, "get_balance_forecast", {})
    r = reg.run(CTX, "list_transactions", {"customer_id": "CUST00002"})  # ignored, not an error
    assert r.facts["matching_count"] > 0


def test_explain_concept_plain(svc):
    from services.chat.foundation_tools import ExplainConceptTool
    r = ExplainConceptTool(svc).run(CTX, {"concept_id": "compare_equal_periods"})
    assert [w.type.value for w in r.widgets] == ["concept_note"]
    assert r.widgets[0].data["id"] == "compare_equal_periods"
    assert r.facts["text"] == r.widgets[0].data["text"]
    assert len(json.dumps(r.facts)) < 1024 and "CUST" not in json.dumps(r.facts)


def test_explain_concept_fills_numbers_from_last_28_days():
    from services.chat.foundation_tools import ExplainConceptTool
    from tests.habits.world import ME, rows_for
    from tests.fakes import FakeClock, FakeTransactionRepository
    clock = FakeClock(date(2026, 9, 15))
    taxi = rows_for(ME)  # taxis: 2026-08-23 and 08-30 (4000 each) and 09-10 (2500) fall in 08-18..09-14
    tool = ExplainConceptTool(TransactionServiceImpl(FakeTransactionRepository(clock, {ME: taxi}), clock))
    ctx = ToolContext(customer_id=ME, today=date(2026, 9, 15), conversation_id="c_1")
    r = tool.run(ctx, {"concept_id": "small_purchases_add_up", "spend_group": "taxis"})
    weekly = 10500 * 7 // 28  # 2625
    assert f"EUR {weekly / 100:.2f} a week" in r.facts["text"]
    assert f"EUR {weekly * 52 / 100:.0f} a year" in r.facts["text"]


@pytest.mark.parametrize("args", [{}, {"concept_id": "nope"}, {"concept_id": "spending_pace", "spend_group": "nope"},
                                  {"concept_id": "spending_pace", "bogus": 1}])
def test_explain_concept_bad_args(svc, args):
    from services.chat.foundation_tools import ExplainConceptTool
    with pytest.raises(ValidationFailed):
        ExplainConceptTool(svc).run(CTX, args)


def test_explain_concept_is_in_default_registry(svc):
    assert default_registry(svc).has("explain_concept")
