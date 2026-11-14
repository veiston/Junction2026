# 0005 — The LLM chooses tools; code calculates; no text-to-SQL

- **Status:** accepted (2026-11-14)
- **Context:** Money answers must be exact and private, even under prompt injection.
- **Decision:** The LLM can only call the fixed tools in `TOOL_CATALOG`. Tools call services, which return facts (aggregates) and widgets. `customer_id` comes from the token, never from the model. The LLM writes the explanation using only numbers present in the facts.
- **Consequences:** no hallucinated euros and no cross-customer leaks. Questions outside the tools get a polite "I can't calculate that yet".
- **Reversibility:** possible but not advised.
