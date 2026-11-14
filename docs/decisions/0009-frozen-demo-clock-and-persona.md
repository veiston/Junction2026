# 0009 — Frozen demo clock and one persona

- **Status:** accepted (2026-11-14)
- **Context:** The data ends on 2026-09-30 (checked). "This week" and "this month" need a stable "today".
- **Decision:** `today` defaults to 2026-09-15 (env DEMO_TODAY, ASSUMED), and no data after today is ever returned. `PUT /demo/clock` can move it (for example to 09-30 for the month-end review). One persona customer is chosen by the foundation (env DEMO_CUSTOMER_ID), with a hidden switch to change it.
- **Consequences:** reproducible demos. The hidden data after today can be used to compare the forecast with what really happened (a pitch moment).
- **Reversibility:** easy.
