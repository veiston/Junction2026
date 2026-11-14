# foundation-frontend-hooks (Wave B — after frontend-foundation is merged)

**Goal:** make the coach UI live: session, chat, chips and "See all" paging, using the API client.
Tested against a mocked `fetch`, no backend needed.

**Read:** `contracts/dto/chat.schema.json`, `transactions.schema.json`, `session.schema.json`, `http-api.openapi.yaml` (`/me`, `/chat`, `/transactions`), `docs/user-stories.md` US-F1..F4.

**Owns (under `frontend/src/`):**
- `chat/useChat.ts`, `chat/useSession.ts` (GET `/me`; 401 → post `{type:'token-expired'}` to `window.parent`), `chat/useTransactions.ts` ("See all" paging)
- Wiring edits in `chat/ChatScreen.tsx` and `App.tsx` limited to connecting these hooks (the only foundation files you may edit; keep props-based components intact)
- `chat/__tests__/`

**Do NOT touch:** widgets, styles, gallery, `api/client.ts` internals (need a change → Blockers), backend.

**Steps**
1. `useSession`: loads `/me`, exposes greeting/state, handles 401.
2. `useChat`: optimistic user message, `POST /chat`, loading and error states (friendly message, retry), appends assistant text + widgets; chip click sends the chip action id.
3. Empty chat shows 3 chips; a chip that gets "coming soon" renders the text normally.
4. `useTransactions`: "See all" opens a paged list; page changes call `/transactions` with the same filter as the widget; totals shown match the widget.

**Done when**
```bash
cd frontend && pnpm typecheck && pnpm test && pnpm build
```
Tests cover: send → response renders text + transaction_list; API error → friendly message; 401 → token-expired message; paging.

**Blockers:** _(agent writes here)_
