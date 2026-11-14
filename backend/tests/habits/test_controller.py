from __future__ import annotations

TOKEN = "good-token"


def test_all_endpoints_need_a_token(http):
    c = http.client
    for method, path in [("GET", "/habits/limit-suggestion"), ("POST", "/habits/limits"),
                         ("GET", "/habits/limits/current"), ("GET", "/habits/limits/1/review"),
                         ("GET", "/habits/challenges/suggestions"), ("GET", "/habits/challenges"),
                         ("POST", "/habits/challenges")]:
        assert c.request(method, path).status == 401, (method, path)


def test_limit_flow(http):
    c = http.client
    s = c.get("/habits/limit-suggestion", token=TOKEN)
    assert s.status == 200 and s.json["basket"] == "everyday" and s.json["month"] == "2026-09"
    assert c.get("/habits/limits/current", token=TOKEN).status == 404
    body = {"month": "2026-09", "amount_cents": 30000}
    created = c.post("/habits/limits", token=TOKEN, json_body=body)
    assert created.status == 201 and created.json["status"] == "active"
    assert c.post("/habits/limits", token=TOKEN, json_body=body).status == 409
    assert c.get("/habits/limits/current", token=TOKEN).json["spent_cents"] == 8500
    assert c.get(f"/habits/limits/{created.json['id']}/review", token=TOKEN).status == 200
    assert c.get("/habits/limits/999/review", token=TOKEN).status == 404


def test_create_limit_validation(http):
    c = http.client
    assert c.post("/habits/limits", token=TOKEN, json_body={"month": "2026-09", "amount_cents": 5}).status == 400
    assert c.post("/habits/limits", token=TOKEN, json_body={"month": "2026-10", "amount_cents": 30000}).status == 400
    assert c.post("/habits/limits", token=TOKEN, json_body={"month": "2026-09", "amount_cents": 30000,
                                                           "customer_id": "CUST00002"}).status == 400
    assert http.limits.rows == []


def test_challenge_flow(http):
    c = http.client
    sug = c.get("/habits/challenges/suggestions", token=TOKEN)
    assert sug.status == 200 and 1 <= len(sug.json["items"]) <= 3
    body = {"template_id": "zero_spend_taxis_14d"}
    assert c.post("/habits/challenges", token=TOKEN, json_body=body).status == 201
    assert c.post("/habits/challenges", token=TOKEN, json_body=body).status == 409
    assert c.post("/habits/challenges", token=TOKEN, json_body={"template_id": "nope_x_7d"}).status == 404
    items = c.get("/habits/challenges", token=TOKEN).json["items"]
    assert len(items) == 1 and items[0]["challenge"]["template_id"] == "zero_spend_taxis_14d"
