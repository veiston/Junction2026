# 0006 — Signed token identity (JWT HS256)

- **Status:** accepted (2026-11-14)
- **Context:** The coach is embedded; S-mobiili would already know who the user is.
- **Decision:** `POST /demo/session` (only when DEMO_MODE=true) simulates the S-mobiili backend and issues a 60-minute HS256 JWT (`sub` = customer_id). embedded-demo passes it in the URL fragment `#token=`. The coach keeps it in memory, removes it from the URL and sends it as `Authorization: Bearer`.
- **Consequences:** shows a realistic security story in the pitch. The demo endpoint must be off outside the demo.
- **Reversibility:** easy. Replace with real SSO later.
