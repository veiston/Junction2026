# Foundation acceptance checklist

## Automated (evidence from this branch)

- [x] `cd backend && uv run pytest -q` → `252 passed, 2 skipped` (the 2 skipped are the `live` Gemini test and one pre-existing skip; live needs `GEMINI_API_KEY`).
- [x] `cd frontend && pnpm test` → `6 files, 20 tests passed`.
- [x] `cd frontend && pnpm build` → `built in 576ms`.
- [x] E2E (`backend/tests/foundation/e2e/`, real app + real services + real SQLite built by the real ingest + `FakeLlm`):
  session → `/me` → `/chat` ("latest transactions") → text + one `transaction_list` widget → `/transactions` paging;
  401 matrix over every protected route (none / forged) plus expired token; every slice route answers 501;
  `PUT /demo/clock` changes `/me` and the visible transactions; out-of-range date → 400; customer isolation.
- [x] Smoke on the real ingested DB (backend on a spare port): `POST /demo/session` → token, `GET /me` → CUST00001 (today 2026-09-15), `GET /transactions` → rows, `POST /chat` without a Gemini key → friendly "can't reach my thinking engine" message (no crash).
- [ ] Live Gemini chat: `GEMINI_API_KEY=… uv run pytest -m live` (not run: no key available when this was written).

## Manual, in a browser (`./run.sh`) — NOT yet done

`./run.sh` was not run end to end: ports 8000/8081 were already occupied by another checkout's processes.
Whoever runs this fills in what was seen.

Prereqs: `./initialize.sh`, `uv run --directory backend python ../scripts/ingest.py` (needs the Challenge data CSVs, see `download.sh`), `GEMINI_API_KEY` in `.env`.

- [ ] `./run.sh` starts backend (8000) and the Expo app (8081); it exits with a clear message if `db/money_coach.sqlite3` is missing. Seen: ____
- [ ] The app opens; tapping the AI tab shows the coach signed in, no login screen. Seen: ____
- [ ] Empty chat shows 3 chips. Seen: ____
- [ ] Each chip answers "coming soon". Seen: ____
- [ ] Ask "show my latest transactions" → text + transaction list widget with "See all". Seen: ____
- [ ] "See all" pages through the transactions. Seen: ____
- [ ] `/dev/gallery` on the coach renders. Seen: ____

## Notes

- `backend/services/container.py` was missing (`api.dependencies` imports `services.container.build_services`), so the real app could not start. Added as a minimal patch to foundation-services.
- `backend/pyproject.toml`: registered the `live` pytest marker.
- `.env.example`: `DEMO_ORIGIN` is now `http://localhost:8081` (Expo web's port) so CORS allows the app.
- Quick-action chips return HTTP 200 with a "coming soon" assistant message (orchestrator behavior), not an HTTP 501; slice HTTP routes return 501.
