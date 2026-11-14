# 0015 — Contract change 1.1.0: learn-by-doing in Improve My Habits

- **Status:** accepted (2026-11-14). Contracts go from 1.0.0 to 1.1.0 (MINOR: only optional fields, one new widget type, one new tool).
- **Context:** the challenge asks for a coach that explains financial concepts in plain language and guides customers to better habits. The first version of Improve My Habits tracked numbers (limit, progress, review) but did not explain anything or let the customer test a change against their own data. The new concept is "One Small Change": find one regular habit, run a 7-day experiment, compare it with the 7 days before, then explain the result with a short note on the concept behind it.
- **What changes (all additive):**
  - `common.schema.json`: new `ConceptNote` (`id` from five fixed ids, `title`, `text`). The text comes from a glossary written by the team and is filled with the customer's numbers; the model does not invent it.
  - `habits.schema.json`: `ChallengeTemplate` gets optional `baseline_cents`, `baseline_count`, `yearly_saving_cents`, `concept`. `ChallengeProgress` gets optional `baseline_cents`, `baseline_count`, `difference_cents`, `change_pct`, `concept`, `next_step`.
  - `widgets.schema.json`: new widget type `concept_note` (data = `ConceptNote`).
  - `ai_tool.py`: new foundation tool `explain_concept` in `TOOL_CATALOG`.
  - `ai_tool.py`: the quick action `improve_my_habits` now forces `suggest_challenges` (find one habit and offer a 7-day experiment) instead of `suggest_monthly_limit`. The monthly limit stays available as an optional next step.
- **The five concepts:** `small_purchases_add_up`, `compare_equal_periods`, `fixed_vs_everyday`, `spending_pace`, `one_week_is_not_proof`.
- **Who is affected:** the habits backend (service, tools), the foundation chat (glossary, `explain_concept`, prompt rule), and the frontend (an "Explain" button on every widget, the `concept_note` widget, the updated challenge widgets). Slices 1 and 2 need no change: they get the "Explain" button for free through the shared widget host, and may add their own concepts to the glossary.
- **Rules for the experiment** (computed by the backend, never by the model):
  - Only the `everyday` basket. Candidate group: at least 3 purchases in the last 28 days and at least 1 in the baseline week; the group with the largest 28-day spend wins. No automatic suggestion when none qualifies.
  - Duration 7 days. `baseline` = spend in the group during the 7 full days before the start. `target` = baseline x 0.5, rounded down to whole euros. No experiment when the baseline is 0.
  - Result after 7 full days: met when `spent <= target`; `difference = baseline - spent`; `change_pct = (baseline - spent) / baseline x 100`.
  - Yearly figure = estimated saving x 52, always presented as an estimate.
- **Reversibility:** easy. Every field is optional; clients that ignore them keep working.
