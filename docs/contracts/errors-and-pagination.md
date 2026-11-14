# Errors, pagination, naming, validation, versioning

## 1. Error format

Every non-2xx response body is `ErrorResponse` (`contracts/dto/errors.schema.json`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "horizon_days must be 30, 60 or 90.",
             "details": [{ "field": "horizon_days", "issue": "not one of [30, 60, 90]" }],
             "request_id": "r_5c1d" } }
```

| code | HTTP | When | Raised as (`errors.py`) |
|---|---|---|---|
| VALIDATION_ERROR | 400 | bad query/body, rule violation (e.g. two filters in /spending) | ValidationFailed |
| UNAUTHORIZED | 401 | missing / invalid token | Unauthorized |
| TOKEN_EXPIRED | 401 | `exp` passed | TokenExpired |
| FORBIDDEN | 403 | demo endpoint while DEMO_MODE=false | Forbidden |
| NOT_FOUND | 404 | missing resource **or resource of another customer** (never 403, to not leak existence) | NotFound |
| CONFLICT | 409 | active limit already exists; same challenge active | Conflict |
| RATE_LIMITED | 429 | > 20 chat turns / minute / customer (estimate, tune) | RateLimited |
| NOT_IMPLEMENTED | 501 | slice stub not yet merged | NotImplementedYet |
| LLM_UNAVAILABLE | 502 | Gemini error / timeout | LlmUnavailable |
| INTERNAL_ERROR | 500 | anything else (message is generic; details logged with request_id) | — |

FastAPI's default 422 validation response is replaced by 400 VALIDATION_ERROR (foundation handler).
`message` is plain English and safe to show. Stack traces never leave the server.

## 2. Pagination

Only list endpoints that can grow use pages (v1: `GET /transactions`).
- Query: `page` (1-based, default 1), `page_size` (default 20, max 100).
- Response: `items`, `page`, `page_size`, `total` (all matches), plus `total_amount_cents`.
- Order: newest first (`tx_timestamp DESC, id DESC`) — stable.
- Page beyond the end → `200` with empty `items`.

Other lists are bounded by design (`maxItems` in the schema) and are not paged.

## 3. Naming

| Thing | Rule | Example |
|---|---|---|
| URL paths | lowercase, kebab-case, plural nouns | `/plan/safe-to-spend`, `/habits/limits` |
| JSON keys, query params | snake_case | `horizon_days` |
| Money | integer cents, suffix `_cents` | `amount_cents` |
| Percent | number 1 decimal, suffix `_pct` | `share_pct` |
| Dates | `YYYY-MM-DD`, suffix `_date` or `date` | `due_date` |
| Months | `YYYY-MM`, key `month` | `2026-09` |
| Enums | lowercase snake_case values | `mandatory_regular` |
| IDs | DB ints for limits/challenges; prefixed strings for chat (`c_…`, `m_…`, `w_…`) | |
| Tools | snake_case verb first | `get_safe_to_spend` |
| Python | modules snake_case; classes PascalCase = schema `title` | `BasketBreakdown` |
| TypeScript | components PascalCase; hooks `useX` | `useForecast` |

## 4. Validation rules

- Validate at the edge with the generated Pydantic DTO; business rules in the service raise `ValidationFailed`.
- `additionalProperties: false` on every DTO: unknown fields → 400.
- Dates must be within 2024-10-01 … today (demo clock); `from_date ≤ to_date`; range ≤ 366 days.
- `message` 1–1000 chars, trimmed; exactly one of `message` / `quick_action`.
- AI tool arguments are validated with the same rules; a failure is returned to the model as
  `{"error": "..."}` once, then the orchestrator gives up and answers with a polite fallback.

## 5. Versioning rule

- Contracts version lives in `contracts/VERSION` (semver) and is echoed by `GET /health`.
- URL major version: `/api/v1`. Widget `version` field: `1`.
- **After approval the contracts are frozen.** A change needs:
  1. A short note in `docs/decisions/NNNN-contract-change-*.md` (what, why, who is affected).
  2. Version bump: PATCH = docs/description only; MINOR = new optional field, new endpoint, new enum value, new tool; MAJOR = rename/remove/required-field change (avoid during the hackathon).
  3. Regenerate code (`scripts/gen_contracts.py`) in the same PR.
  4. Tell all workers (chat message with the version and affected files).
- Additive changes only during the hackathon; a slice may never edit `contracts/` in its task branch.
