# foundation-services (Wave B — after models-and-ports is merged)

**Goal:** SessionService, TransactionService, the chat orchestrator with the tool registry and one
tool (`list_transactions`), all tested against **fakes** (fake repos from models-and-ports, `FakeLlm`
written inline if `adapter-llm` is not merged yet).

**Read:** `contracts/interfaces/controllers/services.py`, `errors.py`, `llm/ai_tool.py`, `llm/llm_client.py`, `docs/contracts/errors-and-pagination.md`, `docs/contracts/dtos.md`, decisions 0005, 0006, 0010, 0011.

**Owns:**
- `backend/services/session_service.py` (signed token with exp 60 min via PyJWT, `verify_token`, `me`, clock get/set)
- `backend/services/transaction_service.py` (filter + paging)
- `backend/services/chat/orchestrator.py`, `tool_registry.py`, `prompts.py`, `foundation_tools.py`
- `backend/services/understand/tools.py`, `plan/tools.py`, `habits/tools.py` — each contains only `TOOLS = []` (stubs; slices fill later)
- `backend/tests/foundation/services/`

**Do NOT touch:** `backend/api/`, repositories, adapters, `contracts/`.

**Rules (non-negotiable)**
- Orchestrator receives `customer_id` from the caller, **never** from the model or message text. Tool args from the model never contain a customer id (privacy test: a prompt asking for another customer's data cannot change the id used).
- LLM sees facts < ~1 KB, never raw transaction lists, `customer_id` or tokens. Widgets are built from tool results, not from model text.
- Registry only accepts tool names present in `TOOL_CATALOG`; unknown tool call from the model → friendly error turn.
- Max tool-call rounds (e.g. 3); `LlmUnavailable` → friendly assistant message, not an exception.
- Quick-action chips: a request with a chip id uses `force_tool`; chips whose slice has no tools yet return "coming soon" text.

**Steps (TDD, one commit each)**
1. SessionService + tests (valid, expired, forged, wrong audience → `Unauthorized`).
2. TransactionService + tests (filters, paging, totals).
3. Tool registry + `list_transactions` tool → `ToolResult{facts, widget}` with a `transaction_list` widget.
4. Orchestrator happy path: user text → LLM tool call → tool → LLM text → `ChatResponse(text, sources, widgets)`.
5. Failure paths: off-topic redirect, LLM down, unknown tool, too many rounds.

**Done when**
```bash
cd backend && uv run pytest tests/foundation/services -q
```

**Blockers:** _(agent writes here)_
