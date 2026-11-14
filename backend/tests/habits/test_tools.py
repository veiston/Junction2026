from __future__ import annotations

import json
from datetime import date

import pytest

from contracts.dto.habits import CreateLimitRequest, StartChallengeRequest
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import TOOL_CATALOG, ToolContext
from services.chat.tool_registry import ToolRegistry
from services.habits.tools import LIMIT_TOOLS, TOOLS, bind_service
from tests.habits.world import ME, make_world

CTX = ToolContext(customer_id=ME, today=date(2026, 9, 15), conversation_id="c_1")


@pytest.fixture
def service():
    svc, *_ = make_world()
    bind_service(svc)
    return svc


def tool(name):
    return next(t for t in [*TOOLS, *LIMIT_TOOLS] if t.name == name)


def test_tools_match_the_catalog():
    assert sorted(t.name for t in [*TOOLS, *LIMIT_TOOLS]) == sorted(TOOL_CATALOG["habits"])
    ToolRegistry(TOOLS)  # accepted by the registry


def test_the_assistant_only_offers_the_challenge_tools():
    assert sorted(t.name for t in TOOLS) == ["get_challenge_progress", "suggest_challenges"]


def check(result, widget_type):
    assert [w.type.value for w in result.widgets] == [widget_type]
    text = json.dumps(result.facts)
    assert len(text) < 1024 and "CUST" not in text


def test_suggest_monthly_limit(service):
    r = tool("suggest_monthly_limit").run(CTX, {})
    check(r, "limit_suggestion")
    assert r.facts["suggested_cents"] == r.widgets[0].data["suggested_cents"]


def test_progress_without_limit_has_no_widget(service):
    r = tool("get_limit_progress").run(CTX, {})
    assert r.widgets == [] and r.facts["has_limit"] is False


def test_progress_and_review_with_limit(service):
    service.create_limit(ME, CreateLimitRequest(month="2026-09", amount_cents=30000))
    p = tool("get_limit_progress").run(CTX, {})
    check(p, "limit_progress")
    assert p.facts["spent_cents"] == 8500
    r = tool("review_limit").run(CTX, {})
    check(r, "limit_review")
    assert r.facts["met"] is True
    assert tool("review_limit").run(CTX, {"month": "2026-07"}).widgets == []


def test_challenge_tools(service):
    s = tool("suggest_challenges").run(CTX, {})
    check(s, "challenge_suggestions")
    assert tool("get_challenge_progress").run(CTX, {}).widgets == []
    service.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    p = tool("get_challenge_progress").run(CTX, {})
    check(p, "challenge_progress")
    assert p.facts["items"][0]["days_left"] == 7 and p.facts["items"][0]["baseline_cents"] == 2500


def test_suggest_challenges_shows_the_running_experiment_instead_of_a_new_one(service):
    service.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    r = tool("suggest_challenges").run(CTX, {})
    check(r, "challenge_progress")
    assert r.facts["already_running"] is True and "new challenge" in r.facts["note"]


def test_suggest_challenges_without_a_habit_returns_facts_only():
    svc, *_ = make_world(date(2024, 10, 5))
    bind_service(svc)
    r = tool("suggest_challenges").run(CTX, {})
    assert r.widgets == [] and r.facts["count"] == 0 and "spending analysis" in r.facts["note"]


def test_suggest_challenges_facts_carry_the_numbers(service):
    item = tool("suggest_challenges").run(CTX, {}).facts["items"][0]
    assert item["baseline_cents"] == 2500 and item["target_cents"] == 1200
    assert item["yearly_saving_cents"] == 1300 * 52 and len(json.dumps(item)) < 1024


@pytest.mark.parametrize("name,args", [
    ("suggest_monthly_limit", {"x": 1}), ("review_limit", {"month": "09-2026"}), ("review_limit", {"month": 5}),
    ("get_challenge_progress", {"limit": 1}),
])
def test_bad_arguments(service, name, args):
    with pytest.raises(ValidationFailed):
        tool(name).run(CTX, args)


def test_customer_id_argument_is_dropped_by_registry(service):
    reg = ToolRegistry(TOOLS)
    r = reg.run(CTX, "suggest_challenges", {"customer_id": "CUST00002"})
    assert r.widgets



def test_suggestion_facts_carry_the_baskets_and_the_twenty_percent_figure(service):
    facts = tool("suggest_challenges").run(CTX, {}).facts
    assert facts["baskets_last_28_days"] is not None
    assert facts["items"][0]["if_cut_by_20_percent_yearly_cents"] == 2500 * 20 // 100 * 52
    assert len(json.dumps(facts)) < 1500 and "CUST" not in json.dumps(facts)


def test_suggestion_facts_name_the_method(service):
    assert "comparing equal periods" in tool("suggest_challenges").run(CTX, {}).facts["method"]


def test_a_finished_challenge_carries_what_you_learned(service):
    service.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    later = ToolContext(customer_id=ME, today=date(2026, 9, 23), conversation_id="c_1")
    service._clock.set_today(date(2026, 9, 23))
    item = tool("get_challenge_progress").run(later, {}).facts["items"][0]
    assert item["status"] in ("won", "lost")
    assert "comparing equal periods" in item["what_you_learned"] and "not proof" in item["what_you_learned"]


def test_asking_for_another_challenge_while_one_runs_shows_the_running_one(service):
    service.start_challenge(ME, StartChallengeRequest(template_id="max_amount_taxis_7d"))
    r = tool("suggest_challenges").run(CTX, {"another": True})
    check(r, "challenge_progress")
    assert r.facts["already_running"] is True and "only one can run at a time" in r.facts["note"]
