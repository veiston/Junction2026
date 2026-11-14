# foundation-embedded-demo (Wave A)

**Goal:** the AI tab in the existing Expo host app opens the coach already signed in.

**Read:** `docs/architecture.md` (embedding), decisions 0002 and 0006, `contracts/interfaces/controllers/http-api.openapi.yaml` (`/demo/session`), `contracts/dto/session.schema.json`.

**Owns:** `embedded-demo/app/ai.tsx`, `embedded-demo/src/config.ts`, optionally `embedded-demo/src/components/AiTabButton.tsx`, and tests under `embedded-demo/__tests__/`.

**Do NOT touch:** other embedded-demo screens, `backend/`, `frontend/`.

**Steps**
1. `config.ts`: `API_BASE_URL` (default `http://localhost:8000/api/v1`), `COACH_URL` (default `http://localhost:5173`), `DEMO_CUSTOMER_ID` — all overridable by `EXPO_PUBLIC_*` env.
2. `ai.tsx`: on mount `POST /demo/session {customer_id}` → `{token}` → render a WebView/iframe (WebView on native, iframe on web) at `COACH_URL#token=<token>`. Loading and error states (retry button). Token never logged.
3. Token refresh: reload the session when the WebView reports 401 via `postMessage({type:'token-expired'})` (coach side comes later; just handle the message).
4. Unit-test the URL building and error state (pure functions, no network).

**Done when**
```bash
cd embedded-demo && pnpm install && pnpm exec tsc --noEmit && pnpm test
```
(add a minimal test script if missing). Manual check is part of the `foundation-tests` task.

**Blockers:** _(agent writes here)_
