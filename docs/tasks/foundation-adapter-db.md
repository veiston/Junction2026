# foundation-adapter-db (Wave B — after models-and-ports is merged)

**Goal:** SQLite repositories implementing the shared ports, a migration runner, and an ingest that
builds the DB with the exact rules from `docs/er.md` §4.

**Read:** `docs/er.md` (all, especially §4), `contracts/interfaces/repositories/shared.py`, decisions 0004, 0007, 0009. Existing code to adapt: `backend/models/database.py`, `backend/models/dao/*`, `backend/services/ingest_service.py`, `scripts/ingest.py`, `db/migrations/0001_core.sql`, `0002_chat.sql`, and their tests in `backend/tests/`.

**Owns:**
- `backend/models/database.py` (connection + migration runner applying `db/migrations/*.sql` in order, tracked in `meta`)
- `backend/models/repositories/` — `sqlite_customer_repo.py`, `sqlite_transaction_repo.py`, `sqlite_monthly_spend_repo.py`, `sqlite_conversation_repo.py`, `clock.py`
- `backend/services/ingest_service.py`, `scripts/ingest.py`, `db/seed/mcc_reference.csv`, `db/migrations/0001_core.sql`, `0002_chat.sql`
- `backend/tests/foundation/test_repositories.py`, `test_ingest_rules.py`
- Removal of `backend/models/dao/` once the repositories replace it (grep for importers first). `backend/services/rag_service.py` and `tests/test_rag.py` are out of scope: leave them.

**Do NOT touch:** entities/enums/value objects/fakes (owned by models-and-ports; need a change → Blockers), `backend/api/`, other services.

**Steps**
1. Decide per existing file: keep, adapt or replace; the repositories must satisfy the Protocols (parametrised contract test that runs the **same** test body against the fake and the SQLite repo).
2. Every repository method takes `customer_id` and filters by it in SQL — a test proves customer B's rows never come back for customer A.
3. Ingest: classification into the three baskets, flow, `monthly_spend`, `meta` (demo clock bounds) exactly per er.md §4; tests on hand-written sample rows for each rule, including edge cases er.md names.
4. `Clock` repository reads `DEMO_TODAY`/override; out-of-range date handled per `docs/contracts/errors-and-pagination.md`.
5. Keep ingest idempotent (re-run → same DB).

**Done when**
```bash
cd backend && uv run pytest tests/foundation/test_repositories.py tests/foundation/test_ingest_rules.py -q && cd .. && uv run --directory backend python ../scripts/ingest.py
```

**Blockers:** _(agent writes here)_
