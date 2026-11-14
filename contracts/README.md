# contracts/

Version: see `VERSION` (semver). **Frozen after approval.** Any change follows the rule in
`docs/contracts/errors-and-pagination.md` § Versioning.

| Folder | What | Direction |
|---|---|---|
| `dto/*.schema.json` | Request/response shapes (JSON Schema 2020-12). Source of truth for Python and TypeScript. | shared |
| `interfaces/controllers/http-api.openapi.yaml` | REST endpoints the backend controllers expose and the frontend calls. | inbound |
| `interfaces/controllers/services.py` | Service interfaces the controllers (and AI tools) call. | inbound |
| `interfaces/controllers/errors.py` | Exceptions services raise; mapped to `ErrorResponse`. | inbound |
| `interfaces/llm/llm_client.py` | The language model port (Gemini adapter implements it). | outbound |
| `interfaces/llm/ai_tool.py` | How a slice plugs AI tools into the chat + frozen tool catalogue. | plug-in |
| `interfaces/repositories/*.py` | Data access ports (SQLite adapters implement them). | outbound |
| `interfaces/frontend/widget-registry.ts` | How a slice plugs widgets into the chat UI. | plug-in |

## Code generation (done by the foundation, not by hand)

The foundation adds one script, `scripts/gen_contracts.py`, that:

1. Generates Pydantic v2 models from every `dto/<stem>.schema.json` into
   `s-money-coach/backend/contracts/dto/<stem>.py` (class names = schema `title`).
2. Copies `interfaces/**/*.py` into `s-money-coach/backend/contracts/interfaces/` unchanged.
3. Generates TypeScript types from `dto/` into `s-money-coach/frontend/src/contracts/index.ts`
   and copies `interfaces/frontend/*.ts` into `s-money-coach/frontend/src/contracts/`.

Generated folders start with a `DO NOT EDIT` header and are owned by the foundation.
Workers never edit generated code: they request a contract change instead.

## Naming

- JSON keys: `snake_case`. Money: integer cents in fields ending `_cents`.
- Dates: `YYYY-MM-DD` (`*_date`, `date`), months: `YYYY-MM` (`month`).
- Percentages: number with 1 decimal in fields ending `_pct`.
