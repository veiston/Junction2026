# 0002 — Standalone coach web app, embedded in a demo host

- **Status:** accepted (2026-11-14)
- **Context:** S-Bank asks for "a web app that can be embedded in a mobile app". Our product is the chat, not the S-mobiili look-alike.
- **Decision:** `s-money-coach/frontend` is a standalone React + Vite + TypeScript + CSS web app. `embedded-demo/` (the existing Expo scaffold) only simulates S-mobiili and shows the coach in its AI tab through a WebView (native) or an iframe (web).
- **Consequences:** it proves the real integration story (a URL plus a token), and judges can also open the coach directly. There are two frontends to run in the demo, plus the CSP `frame-ancestors` setup.
- **Reversibility:** medium. Moving the coach into Expo later means rewriting the widgets for React Native.
