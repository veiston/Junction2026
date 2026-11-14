from __future__ import annotations

import json
from datetime import date

import pytest

from contracts.dto.habits import CreateLimitRequest, StartChallengeRequest
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.llm.ai_tool import TOOL_CATALOG, ToolContext
from services.chat.tool_registry import ToolRegistry
from services.habits.tools import TOOLS, bind_service
from tests.habits.world import ME, make_world

CTX = ToolContext(customer_id=ME, today=date(2026, 9, 15), conversation_id="c_1")


@pytest.fixture
def service():
    svc, *_ = make_world()
    bind_service(svc)
    return svc


def tool(name):
    return next(t for t in TOOLS if t.name == name)


def test_tools_match_the_catalog():
    assert sorted(t.name for t in TOOLS) == sorted(TOOL_CATALOG["habits"])
    ToolRegistry(TOOLS)  # accepted by the registry


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
    service.start_challenge(ME, StartChallengeRequest(template_id="zero_spend_taxis_14d"))
    p = tool("get_challenge_progress").run(CTX, {})
    check(p, "challenge_progress")
    assert p.facts["items"][0]["days_left"] == 14


@pytest.mark.parametrize("name,args", [
    ("suggest_monthly_limit", {"x": 1}), ("review_limit", {"month": "09-2026"}), ("review_limit", {"month": 5}),
    ("get_challenge_progress", {"limit": 1}),
])
def test_bad_arguments(service, name, args):
    with pytest.raises(ValidationFailed):
        tool(name).run(CTX, args)


def test_customer_id_argument_is_dropped_by_registry(service):
    reg = ToolRegistry(TOOLS)
    r = reg.run(CTX, "suggest_monthly_limit", {"customer_id": "CUST00002"})
    assert r.widgets
