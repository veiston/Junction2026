# foundation-controllers (Wave B — after models-and-ports is merged)

**Goal:** the FastAPI app: factory, security, error handler, all routers mounted, foundation
controllers implemented, slice controllers as 501 stubs. Tested with **fake services**
(FastAPI dependency overrides) — it does not need the real services or DB.

**Read:** `contracts/interfaces/controllers/http-api.openapi.yaml`, `services.py`, `errors.py`, `docs/contracts/errors-and-pagination.md`, decisions 0003, 0006.

**Owns:**
- `backend/main.py`, `backend/api/server.py`, `routes.py`, `security.py`
- `backend/api/controllers/health_controller.py`, `session_controller.py`, `chat_controller.py`, `transactions_controller.py`
- `backend/api/controllers/understand_controller.py`, `plan_controller.py`, `habits_controller.py` — **every route → 501** with an `ErrorResponse`
- `backend/api/dependencies.py` (wiring: builds real repos/services/LLM from config; overridable in tests)
- `backend/tests/foundation/controllers/`

**Do NOT touch:** services, repositories, adapters, `contracts/`.

**Steps**
1. `server.py`: app factory, CORS (only `COACH_ORIGIN`/`DEMO_ORIGIN`), CSP/security headers, request-id middleware + logging with it, exception handler mapping `errors.py` → `ErrorResponse` with the right status.
2. `security.py`: `Authorization: Bearer` → `SessionService.verify_token` → `customer_id` dependency. Missing/expired/forged → 401.
3. Foundation endpoints: `/health`, `POST /demo/session`, `GET/PUT /demo/clock` (out of range → 400), `/me`, `POST /chat`, `GET /transactions` — shapes exactly per OpenAPI; `customer_id` is taken from the token only, never from query/body.
4. 501 stubs for all `/understand`, `/plan`, `/habits` paths (match every path in the OpenAPI).
5. Contract test: every path+method in the OpenAPI is mounted (compare against `app.routes`).

**Done when**
```bash
cd backend && uv run pytest tests/foundation/controllers -q
```
The tests include: 401 for no/expired/forged token on every protected route; 501 on every slice route; error envelope shape.

**Blockers:** _(agent writes here)_
