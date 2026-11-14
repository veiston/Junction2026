# 0020 — Contract change 1.4.0: notifications behind the bell

- **Status:** accepted (2026-11-15). Contracts go from 1.3.0 to 1.4.0 (MINOR: new schema and two new endpoints, nothing changed or removed).
- **Context:** the bell in the coach only knew one thing, "a challenge has ended", worked out in the app. The coach should also tell the customer when their spending habits change, and now and then invite them to try a challenge.
- **What changes (additive):**
  - `dto/notifications.schema.json`: `Notification` (id, kind, tone, title, text, ask, created_date) and `NotificationList` (items, unread_count).
  - `GET /notifications`: unread notices, newest first. `POST /notifications/{notification_id}/read`: 204, also when already read.
  - `NotificationService` in `interfaces/controllers/services.py`.
- **Rules (deterministic, never the LLM):**
  - `spending_change`: everyday spending of the last 7 days vs the 7 days before, when it moves at least 25 % and at least 20 EUR. Names the group that moved most, and the running challenge if there is one.
  - `challenge_ended`: a challenge finished (won or lost) and its result was not opened yet. Replaces the app-side check.
  - `challenge_suggestion`: no challenge running, at most one every 14 days.
- **Behaviour:** opening a notice marks it read and sends its `ask` question to the coach, which answers with the usual cards.
- **Who is affected:** foundation (new controller, service, repository, migration 0004); the app's bell. Slices: none.
- **Reversibility:** easy.
