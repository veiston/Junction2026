# 0008 — Contracts in JSON Schema / OpenAPI with generated code

- **Status:** accepted (2026-11-14)
- **Context:** The backend is Python and the frontend is TypeScript; hand-copied types drift apart.
- **Decision:** DTOs live in `contracts/dto/*.schema.json`, the HTTP API in `contracts/interfaces/controllers/http-api.openapi.yaml`, and ports as Python Protocols / TS types in `contracts/interfaces/`. `scripts/gen_contracts.py` (foundation) generates Pydantic and TS from them. Money is integer cents.
- **Consequences:** one source of truth. Workers never edit generated code; changes follow the versioning rule.
- **Reversibility:** medium.
