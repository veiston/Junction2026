# 0003 — FastAPI with MVC and a services layer

- **Status:** accepted (2026-11-14)
- **Context:** The SDF defaults medium work to hexagonal; the team prefers MVC. Options are compared in `docs/architecture.md`.
- **Decision:** Controllers = FastAPI routers, Models = entities + SQLite repositories behind interfaces, Views = contract DTOs. All maths lives in `services/`, which both the controllers and the AI tools call.
- **Consequences:** low ceremony and familiar to the team. The interfaces in `contracts/interfaces` keep the DB and LLM swappable and fakeable in tests. There is no pure domain core.
- **Reversibility:** medium. Services can be lifted into a domain core later.
