# 0019 — Contract change 1.3.0: the assistant can skip a challenge

- **Status:** accepted (2026-11-14). Contracts go from 1.2.0 to 1.3.0 (MINOR: one new tool in `TOOL_CATALOG`).
- **Context:** the customer can skip a running challenge with a button on its card (1.2.0). When they said it in words ("I want to skip the challenge"), the assistant had no way to do it and answered that it could not be skipped.
- **What changes (additive):** new habits tool `stop_challenge`, no arguments. It ends the running challenge (status `cancelled`, no verdict) through the same service call as the button, and returns facts only.
- **Behaviour:** the assistant calls it when the customer clearly wants to skip, stop or give up the running challenge, then confirms in one kind sentence. If nothing is running it says so.
- **Reversibility:** easy.
