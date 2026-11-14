# DTOs (request and response shapes)

Source of truth: `contracts/dto/*.schema.json` (version in `contracts/VERSION`). This page explains
them; if this page and the schema disagree, **the schema wins** and this page is a bug.

## Files

| File | Contains | Owner of behaviour |
|---|---|---|
| `common.schema.json` | Cents, IsoDate, YearMonth, Percent, CustomerId, Basket, Flow, Category, SpendGroup, GroupAmount, BasketAmount, Period, Source, TrendPoint | shared |
| `errors.schema.json` | ErrorCode, ErrorDetail, ErrorBody, ErrorResponse | foundation |
| `session.schema.json` | DemoSessionRequest, SessionToken, AgeBand, Me, DemoClockRequest, DemoClock | foundation |
| `transactions.schema.json` | Transaction, TransactionFilter, TransactionPage, TransactionListData | foundation |
| `chat.schema.json` | QuickAction, ChatRequest, AssistantMessage, ChatResponse | foundation |
| `widgets.schema.json` | WidgetType, Widget (`type` → `data` schema) | shared |
| `understand.schema.json` | BasketDetail, BasketBreakdown, BasketTrend(Month), SpendingQuery, SpendingSummary, Persona, PersonaTrait, SpenderProfile, PeerGroup, OpenDataReference, PeerBenchmark | W1 |
| `plan.schema.json` | HorizonDays, Confidence, Bill, IncomeEvent, BalanceForecast, UpcomingBills, ExpenseAlert(s), CalculationStep, SafeToSpend, WhatIf* | W2 |
| `habits.schema.json` | MonthAmount, LimitSuggestion, CreateLimitRequest, LimitStatus, SpendingLimit, CumulativePoint, LimitProgress, LimitReview, ChallengeRule, ChallengeTemplate, ChallengeSuggestions, StartChallengeRequest, Challenge, ChallengeProgress, ChallengeList | W3 |

## Endpoint → DTO

| Method + path | Request | Response | Owner |
|---|---|---|---|
| GET /health | — | inline `{status, contracts_version}` | F |
| POST /demo/session | DemoSessionRequest | SessionToken (201) | F |
| GET / PUT /demo/clock | — / DemoClockRequest | DemoClock | F |
| GET /me | — | Me | F |
| POST /chat | ChatRequest | ChatResponse | F |
| GET /transactions | query = TransactionFilter + page | TransactionPage | F |
| GET /understand/baskets | `month` | BasketBreakdown | W1 |
| GET /understand/trend | `months` | BasketTrend | W1 |
| GET /understand/spending | query = SpendingQuery | SpendingSummary | W1 |
| GET /understand/profile | — | SpenderProfile | W1 |
| GET /understand/benchmark | `scope`, `key` | PeerBenchmark | W1 |
| GET /plan/forecast | `horizon_days` | BalanceForecast | W2 |
| GET /plan/bills | `horizon_days` | UpcomingBills | W2 |
| GET /plan/alerts | `days` | ExpenseAlerts | W2 |
| GET /plan/safe-to-spend | — | SafeToSpend | W2 |
| POST /plan/what-if | WhatIfRequest | WhatIfResult | W2 |
| GET /habits/limit-suggestion | — | LimitSuggestion | W3 |
| POST /habits/limits | CreateLimitRequest | SpendingLimit (201) | W3 |
| GET /habits/limits/current | — | LimitProgress | W3 |
| GET /habits/limits/{id}/review | — | LimitReview | W3 |
| GET /habits/challenges/suggestions | — | ChallengeSuggestions | W3 |
| GET / POST /habits/challenges | — / StartChallengeRequest | ChallengeList / ChallengeProgress (201) | W3 |

## Widget ownership (frontend component + AI tool that emits it)

| Widget type | data DTO | Emitted by tool | Interactive calls | Owner |
|---|---|---|---|---|
| transaction_list | TransactionListData | list_transactions | GET /transactions (paging) | F |
| basket_breakdown | BasketBreakdown | get_basket_breakdown | GET /understand/baskets?month (month switch); tap basket → sendChat | W1 |
| basket_trend | BasketTrend | get_basket_trend | GET /understand/trend?months | W1 |
| spending_summary | SpendingSummary | get_spending | "See all" → GET /transactions | W1 |
| spender_profile | SpenderProfile | get_spender_profile | — | W1 |
| peer_benchmark | PeerBenchmark | compare_with_peers | — | W1 |
| balance_forecast | BalanceForecast | get_balance_forecast | GET /plan/forecast?horizon_days (30/60/90) | W2 |
| upcoming_bills | UpcomingBills | get_upcoming_bills | — | W2 |
| expense_alerts | ExpenseAlerts | get_expense_alerts | tap → sendChat | W2 |
| safe_to_spend | SafeToSpend | get_safe_to_spend | — | W2 |
| what_if | WhatIfResult | simulate_what_if | POST /plan/what-if (slider) | W2 |
| limit_suggestion | LimitSuggestion | suggest_monthly_limit | POST /habits/limits (Accept) | W3 |
| limit_progress | LimitProgress | get_limit_progress | GET /habits/limits/current | W3 |
| limit_review | LimitReview | review_limit | — | W3 |
| challenge_suggestions | ChallengeSuggestions | suggest_challenges | POST /habits/challenges (Start) | W3 |
| challenge_progress | ChallengeProgress | get_challenge_progress | GET /habits/challenges | W3 |

## Example: one chat turn

Request
```json
{ "conversation_id": null, "message": "How much did I spend on taxis last month?", "quick_action": null }
```
Response (shortened)
```json
{
  "conversation_id": "c_9f2e",
  "message": {
    "id": "m_41", "role": "assistant", "created_at": "2026-09-15T10:02:11Z",
    "text": "You spent **84,20 €** on taxis in August across **6 rides**, about 21 € more than in July.",
    "widgets": [{ "id": "w_1", "type": "spending_summary", "version": 1, "data": { "label": "Taxis", "amount_cents": 8420, "tx_count": 6, "...": "..." } }],
    "suggestions": ["What if I took half as many taxis?", "Show my everyday basket"],
    "sources": [{ "description": "Calculated from your transactions", "period": { "from_date": "2026-08-01", "to_date": "2026-08-31" }, "tx_count": 6, "external_url": null }],
    "disclaimer": null
  }
}
```
(The amounts above are illustrative, not real data.)
