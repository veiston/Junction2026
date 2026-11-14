# foundation-models-and-ports (Wave A)

**Goal:** the shared base every other backend task imports: config, codegen of contracts, domain
models, and in-memory fakes of every port. Small and fast — others are waiting on it.

**Read:** `contracts/README.md`, `contracts/interfaces/repositories/shared.py`, `docs/er.md` §1–4, `docs/contracts/dtos.md`, decisions 0003, 0008, 0009.

**Owns:**
- `scripts/gen_contracts.py`, `backend/contracts/` (generated), `frontend/src/contracts/` (generated)
- `backend/config.py` (env: GEMINI_API_KEY, GEMINI_MODEL, JWT_SECRET, DEMO_MODE, DEMO_TODAY, DB_PATH, COACH_ORIGIN, DEMO_ORIGIN), `.env.example`
- `backend/models/entities/`, `backend/models/enums/` (basket, flow), `backend/models/value_objects/` (money, year_month, period)
- `backend/tests/fakes/` — in-memory fakes of Clock, CustomerRepository, TransactionRepository, MonthlySpendRepository, ConversationRepository + one fixture customer with ~30 transactions in all 3 baskets
- `backend/pyproject.toml` (add pydantic, pytest, datamodel-code-generator, PyJWT; keep existing deps)

**Do NOT touch:** `backend/models/dao/`, `backend/services/`, `backend/api/`, `backend/adapters/`, anything in `frontend/` except `frontend/src/contracts/`.

**Steps**
1. `gen_contracts.py`: DTO schemas → Pydantic (`backend/contracts/dto/*.py`), copy `interfaces/**/*.py`; TS types + `widget-registry.ts` into `frontend/src/contracts/`. Header `DO NOT EDIT`. Output paths: root `backend/` and `frontend/`.
2. Entities/enums/value objects matching `docs/er.md` (money = int cents). Keep existing entity files if they already match; fix otherwise.
3. Fakes implementing the Protocols; fake clock frozen to `DEMO_TODAY`.
4. `config.py` reading env with defaults (DEMO_MODE=true).

**Done when**
```bash
cd backend && uv run python ../scripts/gen_contracts.py && uv run pytest tests/foundation/test_models_and_fakes.py -q
```
Test must prove: contracts import; each fake satisfies its Protocol (`isinstance` via `runtime_checkable` or a typed assignment checked with a simple call); fixture customer has all 3 baskets; money/year_month value objects round-trip.

**Blockers:** _(agent writes here)_
