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
    assert reg.has("list_transactions") and [s.name for s in reg.specs()][0] == "list_transactions"
    with pytest.raises(UnknownTool):
        reg.run(CTX, "get_balance_forecast", {})
    r = reg.run(CTX, "list_transactions", {"customer_id": "CUST00002"})  # ignored, not an error
    assert r.facts["matching_count"] > 0
