# 0011 — Gemini behind an LlmClient port

- **Status:** accepted (2026-11-14)
- **Context:** `.env.example` has GEMINI_API_KEY. A local model is a "could" extra.
- **Decision:** Only `adapters/llm/gemini_client.py` imports the Gemini SDK. The model name comes from env `GEMINI_MODEL`. Which model is UNKNOWN: the foundation picks a current fast model that supports function calling.
- **Consequences:** a local model is one new adapter. Data goes to Google, so only aggregates are sent (NFR-3), and the pitch says so.
- **Reversibility:** easy.
