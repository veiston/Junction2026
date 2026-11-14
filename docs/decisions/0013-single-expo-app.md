# 0013 — One Expo / React Native app for the whole frontend

- **Status:** accepted (2026-11-14). Supersedes [0002](0002-standalone-coach-embedded-in-demo-host.md).
- **Context:** 0002 split the frontend in two: a standalone React + Vite coach web app and the Expo S-mobiili look-alike (`embedded-demo/`) that embedded the coach through a WebView / iframe. That meant two frontends to run, a token handed over in the URL fragment, a CSP/CORS setup for embedding, and widgets written for the DOM that would have to be rewritten if the coach ever lived inside a native app.
- **Decision:** the whole frontend is one Expo / React Native app in `frontend/` (tabs Koti, Etukortti, Pankki, Minä, plus the AI tab). The coach is a native screen (`app/ai.tsx`), not a web app. There is no Vite app, no WebView and no iframe. The AI screen calls `POST /demo/session` itself, keeps the token in memory (`src/auth/token.ts`), and calls the API through `src/api/client.ts` (base URL from `src/config.ts`, default `http://localhost:8000/api/v1`). Tokens never appear in URLs. Tests run with jest-expo. In the demo only two processes run: backend (8000) and Expo web (8081).
- **Consequences:**
  - Chat, widgets and the slice registries are rebuilt in React Native in follow-up tasks; the DOM versions (`chat/`, `widgets/`, `dev/`, `styles/`, `slices/*/index.ts` stubs) were removed. Generated types in `frontend/src/contracts/` are kept.
  - `COACH_ORIGIN` and the CORS entry for the old coach port are now unused by any client; CORS keeps `http://localhost:8081` (`DEMO_ORIGIN` default). The `frame-ancestors 'none'` CSP header stays: it forbids framing and was never needed for embedding.
  - Backend default Gemini model is `gemini-3.6-flash` (`gemini-2.5-flash` is no longer available).
- **Reversibility:** low-to-medium. A web-only coach would again need its own DOM widgets.

## Blockers

None.
