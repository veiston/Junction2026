import os

import pytest

from tests.foundation.e2e.conftest import make_client

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(not os.environ.get("GEMINI_API_KEY"), reason="GEMINI_API_KEY not set"),
]


def test_live_chat_latest_transactions(db_path):
    from config import Config

    client = make_client(db_path, None, gemini_api_key=os.environ["GEMINI_API_KEY"])
    # llm=None -> build_services wires the real Gemini client from the key
    token = client.post("/demo/session", json_body={"customer_id": "CUST00001"}).json["token"]
    resp = client.post("/chat", token=token, json_body={"message": "show my latest transactions"})
    assert resp.status == 200, resp.json
    msg = resp.json["message"]
    assert msg["text"]
    assert any(w["type"] == "transaction_list" for w in msg["widgets"])
