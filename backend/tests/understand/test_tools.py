"""The 5 understand AI tools on the fakes: argument checks, facts and widgets."""

from __future__ import annotations

import json
from datetime import date

import pytest

from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import QUICK_ACTION_TOOL, TOOL_CATALOG, ToolContext
from services.chat.tool_registry import ToolRegistry, default_registry
from services.understand import tools as T
from tests.fakes.fixtures import CUSTOMER_ID
from tests.understand._builders import make_service

CTX = ToolContext(customer_id=CUSTOMER_ID, today=date(2026, 9, 15), conversation_id="c_1")


@pytest.fixture
def registry():
    svc, _ = make_service()
    seen: list[date] = []

    def service_for(today):
        seen.append(today)
        return svc

    reg = ToolRegistry(T.build_tools(service_for))
    reg.seen = seen
    return reg


def test_tools_match_the_frozen_catalogue():
    assert sorted(t.name for t in T.TOOLS) == sorted(TOOL_CATALOG["understand"])
    assert QUICK_ACTION_TOOL["understand_my_money"] in {t.name for t in T.TOOLS}
    for t in T.TOOLS:
        assert t.parameters["type"] == "object" and "$ref" not in json.dumps(t.parameters)
        assert 0 < len(t.description) < 400


def test_foundation_registry_now_contains_the_understand_tools():
    assert default_registry(transaction_service=None).has("get_basket_breakdown")


def test_tools_use_the_demo_today_from_the_context(registry):
    registry.run(CTX, "get_basket_breakdown", {})
    assert registry.seen == [date(2026, 9, 15)]


def test_basket_breakdown_tool(registry):
    r = registry.run(CTX, "get_basket_breakdown", {})
    assert [w.type.value for w in r.widgets] == ["basket_breakdown"]
    assert r.facts["month"] == "2026-09" and r.facts["total_spending_cents"] == 154880
    assert [b["amount_cents"] for b in r.facts["baskets"]] == [122630, 20900, 11350]
    assert len(json.dumps(r.facts)) < 1500 and r.sources


def test_basket_trend_tool(registry):
    r = registry.run(CTX, "get_basket_trend", {"months": 3.0})
    assert [m["month"] for m in r.facts["months"]] == ["2026-07", "2026-08", "2026-09"]
    assert r.facts["last_month_in_progress"] is True
    assert r.widgets[0].type.value == "basket_trend"


def test_spending_tool_for_taxis_last_month(registry):
    r = registry.run(CTX, "get_spending", {"spend_group": "taxis", "from_date": "2026-08-01", "to_date": "2026-08-31"})
    assert (r.facts["label"], r.facts["amount_cents"], r.facts["tx_count"]) == ("Taxis", 2100, 1)
    assert r.facts["largest"]["amount_cents"] == 2100
    assert r.widgets[0].type.value == "spending_summary"


def test_spending_tool_defaults_to_this_month(registry):
    r = registry.run(CTX, "get_spending", {"basket": "everyday"})
    assert r.facts["period"] == "2026-09-01..2026-09-15" and r.facts["amount_cents"] == 11350


def test_spender_profile_tool(registry):
    r = registry.run(CTX, "get_spender_profile", {})
    assert r.facts["persona"] == "balanced" and r.widgets[0].type.value == "spender_profile"


def test_compare_with_peers_tool_infers_the_scope(registry):
    r = registry.run(CTX, "compare_with_peers", {"key": "everyday"})
    assert r.widgets[0].type.value == "peer_benchmark" and "25-34" in r.facts["peer_group"]


@pytest.mark.parametrize("name,args", [
    ("get_basket_breakdown", {"month": "2027-01"}),
    ("get_basket_breakdown", {"colour": "red"}),
    ("get_basket_trend", {"months": 40}),
    ("get_spending", {}),
    ("get_spending", {"spend_group": "unicorns"}),
    ("get_spending", {"basket": "everyday", "from_date": "yesterday"}),
    ("get_spending", {"spend_group": "salary"}),
    ("compare_with_peers", {}),
    ("compare_with_peers", {"scope": "category", "key": "Salary"}),
])
def test_bad_arguments_raise_validation_failed(registry, name, args):
    with pytest.raises(ValidationFailed):
        registry.run(CTX, name, args)


def test_customer_id_from_the_model_is_ignored(registry):
    # the registry drops customer_id: the tool always reads the customer of the token (ctx)
    r = registry.run(CTX, "get_basket_breakdown", {"customer_id": "CUST00002"})
    assert r.facts["total_spending_cents"] == 154880


@pytest.mark.parametrize("name,args", [
    ("get_basket_breakdown", {}), ("get_basket_trend", {}), ("get_spending", {"basket": "everyday"}),
    ("get_spender_profile", {}), ("compare_with_peers", {"key": "everyday"}),
])
def test_every_tool_tells_the_model_to_keep_the_reply_short(registry, name, args):
    hint = registry.run(CTX, name, args).facts["reply_hint"]
    assert "sentence" in hint and len(hint) < 250
