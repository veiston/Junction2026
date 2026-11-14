# foundation-adapter-llm (Wave A)

**Goal:** `LlmClient` implemented on Gemini, nothing else in the repo imports the Gemini SDK.

**Read:** `contracts/interfaces/llm/llm_client.py`, `contracts/interfaces/controllers/errors.py`, decision 0011, existing `backend/gemini_ai.py`.

**Owns:**
- `backend/adapters/llm/gemini_client.py`, `backend/adapters/llm/__init__.py`
- `backend/adapters/llm/fake_llm.py` (scripted fake: returns a queue of `LlmTurn`s; used by services/tests of others)
- `backend/tests/foundation/test_gemini_client.py`, `backend/tests/foundation/test_fake_llm.py`

**Do NOT touch:** everything else. Do not import from `backend/models` or `backend/services`. `backend/gemini_ai.py` may be deleted at the end only if nothing imports it (grep first).

**Steps**
1. Map `ToolSpec` → Gemini function declarations; `LlmMessage` (system/user/assistant/tool) → Gemini contents; response → `LlmTurn` with `ToolCall`s and `finish_reason`.
2. `force_tool` → forced function-calling mode with only that tool allowed.
3. Network/quota/timeout errors → raise `LlmUnavailable`. Safety block → `finish_reason="safety"`. Honour `timeout_s`.
4. Unit tests mock the SDK client (inject it through the constructor; no network in tests). Cover: text turn, tool-call turn, force_tool, error mapping, safety.
5. One manual, **optional** smoke test marked `@pytest.mark.live`, skipped unless `GEMINI_API_KEY` is set.

**Done when**
```bash
cd backend && uv run pytest tests/foundation/test_gemini_client.py tests/foundation/test_fake_llm.py -q
```

**Blockers:** (none blocking; notes)
- `pytest` is not in `backend/pyproject.toml` dev deps (not mine to edit). Ran with `uv run --with pytest pytest ...`; `foundation-tests` should add it.
- `backend/gemini_ai.py` NOT deleted: `backend/main.py` still imports it.
- Tests prepend `backend/` and repo root to `sys.path` themselves (no conftest owned); the app wiring must do the same for `contracts`.
- Model env: `GEMINI_MODEL`, falling back to `.env.example`'s `GEMINI_DEFAULT_MODEL`, then `gemini-2.5-flash`.
- `@pytest.mark.live` marker is unregistered (harmless warning); register it in pyproject/conftest later.
