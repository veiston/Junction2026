import sys
from pathlib import Path

for p in (Path(__file__).resolve().parents[2], Path(__file__).resolve().parents[3]):  # backend/ and repo root (contracts)
    sys.path.insert(0, str(p))

import json

import pytest

from adapters.llm.fake_llm import FakeLlm
from contracts.dto.chat import ChatRequest, QuickAction
from contracts.dto.plan import BalanceForecast, ExpenseAlerts, SafeToSpend, UpcomingBills, WhatIfResult
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import ToolContext
from contracts.interfaces.llm.llm_client import LlmTurn, ToolCall
from services.chat.orchestrator import ChatOrchestrator
from services.chat.tool_registry import ToolRegistry
from services.plan.tools import build_plan_tools
from tests.fakes import FakeClock, FakeConversationRepository
from tests.plan._world import CUSTOMER_ID, TODAY, make_service

MAX_FACTS_BYTES = 1024
CTX = ToolContext(customer_id=CUSTOMER_ID, today=TODAY, conversation_id="c1")
WHAT_IF_ARGUMENTS = {"spend_group": "restaurants", "change_pct": -20}


def tool(name):
    return next(t for t in build_plan_tools(make_service()) if t.name == name)


def run(name, arguments=None):
    return tool(name).run(CTX, arguments or {})


@pytest.mark.parametrize(
    "name, arguments, widget_type, dto_class",
    [
        ("get_balance_forecast", {}, "balance_forecast", BalanceForecast),
        ("get_upcoming_bills", {}, "upcoming_bills", UpcomingBills),
        ("get_expense_alerts", {}, "expense_alerts", ExpenseAlerts),
        ("get_safe_to_spend", {}, "safe_to_spend", SafeToSpend),
        ("simulate_what_if", WHAT_IF_ARGUMENTS, "what_if", WhatIfResult),
    ],
)
def test_tool_returns_its_widget_with_dto_data(name, arguments, widget_type, dto_class):
    result = run(name, arguments)
    assert [w.type.value for w in result.widgets] == [widget_type]
    assert result.widgets[0].version == 1
    dto_class.model_validate(result.widgets[0].data)
    assert len(result.sources) == 1


@pytest.mark.parametrize(
    "name, arguments",
    [
        ("get_balance_forecast", {}),
        ("get_upcoming_bills", {}),
        ("get_expense_alerts", {}),
        ("get_safe_to_spend", {}),
        ("simulate_what_if", {**WHAT_IF_ARGUMENTS, "goal_cents": 100000}),
    ],
)
def test_facts_are_small_and_json_serialisable(name, arguments):
    facts = run(name, arguments).facts
    assert len(json.dumps(facts)) < MAX_FACTS_BYTES


@pytest.mark.parametrize("name", [t.name for t in build_plan_tools(None)])
def test_unknown_argument_is_rejected(name):
    with pytest.raises(ValidationFailed):
        run(name, {"colour": "red"})


@pytest.mark.parametrize("horizon_days", [45, "30", True])
def test_forecast_rejects_unsupported_horizon(horizon_days):
    with pytest.raises(ValidationFailed):
        run("get_balance_forecast", {"horizon_days": horizon_days})


def test_forecast_uses_the_requested_horizon():
    result = run("get_balance_forecast", {"horizon_days": 60})
    assert result.facts["horizon_days"] == 60


def test_alerts_reject_days_out_of_range():
    with pytest.raises(ValidationFailed):
        run("get_expense_alerts", {"days": 3})


def test_what_if_needs_a_target():
    with pytest.raises(ValidationFailed):
        run("simulate_what_if", {"change_pct": -20})


def test_what_if_rejects_two_targets():
    with pytest.raises(ValidationFailed):
        run("simulate_what_if", {**WHAT_IF_ARGUMENTS, "category": "Restaurants"})


def test_what_if_needs_change_pct():
    with pytest.raises(ValidationFailed):
        run("simulate_what_if", {"spend_group": "restaurants"})


def test_what_if_rejects_change_pct_out_of_range():
    with pytest.raises(ValidationFailed):
        run("simulate_what_if", {"spend_group": "restaurants", "change_pct": -150})


def test_what_if_rejects_an_unknown_spend_group():
    with pytest.raises(ValidationFailed):
        run("simulate_what_if", {"spend_group": "yachts", "change_pct": -20})


def test_what_if_facts_include_goal_only_when_asked():
    assert "goal_cents" not in run("simulate_what_if", WHAT_IF_ARGUMENTS).facts
    assert run("simulate_what_if", {**WHAT_IF_ARGUMENTS, "goal_cents": 100000}).facts["goal_cents"] == 100000


def test_registry_accepts_all_five_tools():
    registry = ToolRegistry(build_plan_tools(make_service()))
    assert len(registry.specs()) == 5


def test_plan_my_finances_quick_action_shows_the_forecast_widget():
    llm = FakeLlm([LlmTurn("", [ToolCall("1", "get_balance_forecast", {})], "tool_calls"), LlmTurn("Done.", [], "stop")])
    registry = ToolRegistry(build_plan_tools(make_service()))
    orchestrator = ChatOrchestrator(llm, registry, FakeConversationRepository(), FakeClock(TODAY))
    response = orchestrator.handle(CUSTOMER_ID, ChatRequest(quick_action=QuickAction.plan_my_finances))
    assert llm.calls[0]["force_tool"] == "get_balance_forecast"
    assert [w.type.value for w in response.message.widgets] == ["balance_forecast"]
