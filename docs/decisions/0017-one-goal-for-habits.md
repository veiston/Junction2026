# 0017 — Improve My Habits has one goal: the 7-day challenge

- **Status:** accepted (2026-11-14). No contract change.
- **Context:** the first version offered a monthly spending limit next to the challenge. Two goals in one feature confused the customer ("why is this card here?") and the limit card showed a different amount from the assistant's text.
- **Decision:** the assistant offers only `suggest_challenges` and `get_challenge_progress`. The three limit tools stay in `services/habits/tools.py` as `LIMIT_TOOLS`, and the limit endpoints and widgets stay in the API, but nothing in the chat reaches them.
- **Reversibility:** easy. Move the tools from `LIMIT_TOOLS` back into `TOOLS`.
