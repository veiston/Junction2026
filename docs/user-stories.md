# User stories

Format: **As a …, I want … so that …** — *Accepted when …*. Priority M/S/C as in `requirements.md`.
"I" is the S-Bank customer unless stated.

## Foundation (Slice 0 — built first, one worker)

| Id | Story | Accepted when | Prio | Use case |
|---|---|---|---|---|
| US-F1 | As a customer, I want to open the coach from the S-mobiili AI tab already signed in, so that I don't log in twice. | Tapping the AI tab in embedded-demo shows the coach with the persona's name-free greeting; no login screen; reload keeps working until the token expires (60 min). | M | UC-01 |
| US-F2 | As a customer, I want to ask any question in my own words, so that I explore my money freely (MyData). | A typed question returns an assistant message with text, sources, and 0–3 widgets; an off-topic question gets a polite redirect; a model failure shows a friendly error, not a crash. | M | UC-02 |
| US-F3 | As a customer, I want three suggested actions, so that I can start without knowing what to ask. | Three chips are shown on an empty chat; each chip triggers its fixed first tool and returns its widget. | M | UC-03 |
| US-F4 | As a customer, I want to see the transactions behind a number, so that I can trust it. | `list_transactions` returns a transaction_list widget; "See all" pages through matching rows; totals match the widget that linked to it. | M | UC-04 |
| US-F5 | As a customer, I want only me to see my data, so that my money stays private. | Requests with no/expired/forged token → 401; a chat asking for another customer's data never returns it (test). | M | UC-01, UC-02 |
| US-F6 | As the pitch presenter, I want to move the demo date, so that I can show a month-end review live. | PUT /demo/clock changes "today"; every endpoint respects it; out-of-range date → 400. | M | UC-17 |

## Slice 1 — Understand my money (Worker 1)

| Id | Story | Accepted when | Prio | Use case |
|---|---|---|---|---|
| US-U1 | As a customer, I want my spending split into the three baskets, so that I see fixed costs vs. money that slips away. | basket_breakdown widget shows 3 baskets with €, %, count, top 5 groups and change vs previous month; sums equal the sum of the month's spending transactions (test). | M | UC-05 |
| US-U2 | As a customer, I want to ask "how much did I spend on taxis last month?", so that I get an exact answer. | The LLM calls `get_spending` with spend_group=taxis and last month's dates; answer € equals SQL sum; up to 5 sample transactions shown. | M | UC-06 |
| US-U3 | As a customer, I want to know what kind of spender I am, so that I understand my patterns without being judged. | spender_profile shows one persona, ≤ 5 traits with evidence, ≤ 3 tips; wording contains no blame words (list in persona rules). | M | UC-07 |
| US-U4 | As a customer, I want to see how my baskets changed over months, so that I notice lifestyle creep. | basket_trend shows 1–12 months (default 6), oldest first; partial current month marked. | S | UC-05 |
| US-U5 | As a customer, I want to compare my spending with people like me, so that numbers get context. | peer_benchmark shows my monthly avg vs peer median, p25–p75 and my percentile; peer group size shown; groups < 30 widen to all cities. | S | UC-08 |
| US-U6 | As a customer, I want an official Finnish reference, so that I trust the comparison. | When a Statistics Finland row exists for the category, it is shown with year and link. | C | UC-08 |

## Slice 2 — Plan my finances (Worker 2)

| Id | Story | Accepted when | Prio | Use case |
|---|---|---|---|---|
| US-P1 | As a customer, I want to see my expected balance for the next 30, 60 or 90 days, so that I avoid running out. | balance_forecast graph with a 30/60/90 selector that re-calls GET /plan/forecast; lowest point marked; method sentence shown. | M | UC-09 |
| US-P2 | As a customer, I want to know what is safe to spend this week, so that I can decide today. | safe_to_spend shows per day, this week, until payday, status, and the step-by-step formula; numbers add up (test). | M | UC-11 |
| US-P3 | As a customer, I want to test "what if I spend 20 % less on restaurants", so that I see what I could save. | what_if widget with a slider (−100…+100 %, step 5) that re-calls POST /plan/what-if; shows monthly + yearly saving and two forecast lines; optional goal shows months-to-goal. | M | UC-12 |
| US-P4 | As a customer, I want to see upcoming bills, so that they don't surprise me. | upcoming_bills lists predicted basket-1 bills with date, amount, confidence, total. | S | UC-10 |
| US-P5 | As a customer, I want alerts about unusually big expenses, so that I notice irregular shocks. | expense_alerts lists ≤ 10 transactions ≥ 3× the group median (rule in er.md) with reason. | S | UC-10 |

## Slice 3 — Improve my habits (Worker 3)

| Id | Story | Accepted when | Prio | Use case |
|---|---|---|---|---|
| US-H1 | As a customer, I want the coach to suggest a monthly limit for everyday spending, so that I have a realistic target. | limit_suggestion shows suggested €, history of last full months, expected saving, rationale; slider range min–max. | M | UC-13 |
| US-H2 | As a customer, I want to adjust and accept the limit, so that the coach tracks it. | Slider + "Accept" button → POST /habits/limits → 201; a second accept in the same month → 409 with a friendly message. Nothing is saved without the button. | M | UC-13 |
| US-H3 | As a customer, I want to see my progress against the limit, so that I can adjust during the month. | limit_progress shows spent, remaining, on-pace line, status (on_track / at_risk / over), daily cumulative chart, top 3 groups. | M | UC-14 |
| US-H4 | As a customer, I want feedback at the end of the month, so that I learn from the result. | review_limit returns met/not met, difference, biggest leak, best week; the AI text praises or encourages without blame. | S | UC-15 |
| US-H5 | As a customer, I want personalised challenges, so that I learn by doing. | ≤ 3 challenge suggestions each with a personal reason; "Start" → 201; challenge_progress card shows days left and on-track. | S | UC-16 |

## Coverage check

All 22 stories map to at least one use case (see `use-cases.md`). Task mapping comes in Phase 6.
