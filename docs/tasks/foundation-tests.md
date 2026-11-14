# foundation-tests (Wave C — after everything else is merged into `foundation`)

**Goal:** prove the whole slice works together and make it start with one command.

**Read:** `docs/vertical-slices.md` Slice 0 ("Done when" and the sequence diagram), `docs/user-stories.md` US-F1..F6.

**Owns:** `run.sh`, `run.bat`, `initialize.sh`, `initialize.bat`, `.env.example` (final), `backend/tests/foundation/e2e/`, `docs/tasks/foundation-acceptance.md` (checklist with evidence). Fixes to other tasks' code only as minimal patches with a commit message naming the task.

**Steps**
1. `run.sh`: start backend (8000), coach (5173) and embedded-demo (Expo web, 8081) with `trap 'kill 0' EXIT`; fail fast if `db/money_coach.sqlite3` is missing with a message to run ingest.
2. Backend e2e through the real app + real SQLite fixture DB + `FakeLlm`: session → `/me` → `/chat` ("latest transactions") → text + `transaction_list` → `/transactions` paging; 401 matrix; every slice route 501; clock PUT respected.
3. One **live** Gemini test (`@pytest.mark.live`, skipped without key) for the same chat.
4. Manual acceptance in a browser: AI tab → chips → question → "See all" → `/dev/gallery`. Record each step in `foundation-acceptance.md` with what was seen.

**Done when**
```bash
cd backend && uv run pytest -q && cd ../frontend && pnpm test && pnpm build
./run.sh   # then the manual checklist in foundation-acceptance.md is fully ticked
```

**Blockers:** _(agent writes here)_
