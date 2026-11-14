# 0018 — Contract change 1.2.0: the customer can stop a challenge

- **Status:** accepted (2026-11-14). Contracts go from 1.1.0 to 1.2.0 (MINOR: one new endpoint, nothing existing changes).
- **Context:** only one challenge runs at a time (decision 0017 follow-up). A customer who cannot keep a challenge was stuck for 7 days and could not try another habit.
- **What changes (additive):**
  - `http-api.openapi.yaml`: `POST /habits/challenges/{challenge_id}/stop` returns the `ChallengeProgress` with status `cancelled` (200). 404 when the challenge is missing or belongs to another customer, 409 when it has already finished.
  - `services.py`: `HabitsService.stop_challenge(customer_id, challenge_id)`.
- **Behaviour:** stopping ends the challenge without a won/lost verdict. The coach describes what happened so far and the customer can start another challenge. Nothing else changes.
- **Reversibility:** easy. Clients that never call the endpoint keep working.
