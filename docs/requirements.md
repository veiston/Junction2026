# Requirements — S-Money Coach

Status: DRAFT for approval · Contracts version 1.0.0 · Last update 2026-11-14

## 1. Product in one paragraph

S-Money Coach is a personal AI financial coach that customers open inside S-mobiili.
It is a single chat. The customer taps one of three suggested actions (Understand my money,
Plan my finances, Improve my habits) or types any question. The coach answers in plain
language **and** with interactive widgets (charts, transaction lists, sliders, progress cards)
inside the conversation. Every number is calculated by deterministic code from the customer's
own transactions, never by the language model. Spending is always explained through S-Bank's
three baskets.

## 2. Users and goals

| User | Goal |
|---|---|
| S-Bank customer (primary; young adults especially) | Understand where money goes, know what is safe to spend, build better habits |
| S-Bank (challenge owner) | First conversational banking coach in Finland; financial literacy; fits S-mobiili |
| Junction judges | See a trustworthy, pedagogical, mobile-first demo in 3 minutes |

Demo persona: one synthetic customer (to be picked by the foundation from the dataset, e.g. a
25–34-year-old in Helsinki). See `docs/decisions/0009-frozen-demo-clock.md`.

## 3. Functional requirements

Priority: **M** = must (demo fails without it), **S** = should, **C** = could (only if time).

### Foundation (F)
| Id | Requirement | Prio |
|---|---|---|
| FR-F1 | The coach is a standalone mobile web app (`s-money-coach/frontend`) embedded in a simulated S-mobiili (`embedded-demo`) AI tab via WebView / iframe. | M |
| FR-F2 | Identity: embedded-demo obtains a signed token and passes it in the URL fragment; the coach never asks the user to log in. | M |
| FR-F3 | Chat: free-text questions and three quick-action chips; answers contain text, up to 3 widgets, up to 3 follow-up suggestion chips, and sources. | M |
| FR-F4 | The LLM chooses tools; tools return facts + widgets; the LLM only writes the explanation. | M |
| FR-F5 | Every transaction is tagged at ingest with flow, spend group and basket (rules in `docs/er.md`). | M |
| FR-F6 | Transaction list widget with "see all" (paged list filtered by basket / category / group / dates). | M |
| FR-F7 | Demo clock: "today" is fixed (default 2026-09-15) and can be moved for the pitch; no data after "today" is ever shown. | M |
| FR-F8 | Widget gallery page (`/dev/gallery`) renders every registered widget with mock data. | S |

### Slice 1 — Understand my money (U)
| Id | Requirement | Prio |
|---|---|---|
| FR-U1 | Three-basket breakdown of a month: euros, % share, count, top groups, change vs previous month. | M |
| FR-U2 | "How much did I spend on X in period Y" for a basket, category or spend group, with sample transactions. | M |
| FR-U3 | Spender profile (non-judgmental persona) from timing and size patterns. | M |
| FR-U4 | Basket trend over the last 1–12 months. | S |
| FR-U5 | Peer comparison with customers of the same age band and city (from the dataset). | S |
| FR-U6 | Statistics Finland reference share next to the peer comparison (static file). | C |

### Slice 2 — Plan my finances (P)
| Id | Requirement | Prio |
|---|---|---|
| FR-P1 | Balance forecast for 30 / 60 / 90 days (user chooses) as a daily graph. | M |
| FR-P2 | Safe-to-spend until next payday: total, per day, this week, with the formula shown step by step. | M |
| FR-P3 | What-if simulator: change one or more baskets / categories / groups by −100…+100 %; see monthly and yearly effect and forecast difference; optional goal. | M |
| FR-P4 | Upcoming mandatory bills in the horizon. | S |
| FR-P5 | Alerts about unusually high expenses. | S |

### Slice 3 — Improve my habits (H)
| Id | Requirement | Prio |
|---|---|---|
| FR-H1 | AI suggests a monthly limit for everyday (basket 3) spending, with a slider range and rationale. | M |
| FR-H2 | User adjusts and accepts the limit (button → saved). | M |
| FR-H3 | Progress of the active limit: spent, remaining, on-pace line, status, chart. | M |
| FR-H4 | End-of-month review numbers; the AI writes the feedback from them. | S |
| FR-H5 | Personalised challenges (e.g. "two weeks without taxis"), start one, see a progress card. | S |

### Extras (out of the three slices)
| Id | Requirement | Prio |
|---|---|---|
| FR-X1 | Voice answers with ElevenLabs (side challenge). | C |
| FR-X2 | Local LLM adapter instead of Gemini. | C |
| FR-X3 | Product suggestions (clearly labelled). | C |

## 4. Non-functional requirements

| Id | Requirement | How we check |
|---|---|---|
| NFR-1 | **Correctness:** every euro amount comes from SQL/Python; the LLM never does arithmetic. | Unit tests per service; chat text numbers must appear in tool facts (prompt rule + spot check). |
| NFR-2 | **Privacy:** a customer can only ever see their own data, even under prompt injection. | customer_id only from token; tests calling with another customer's ids return 404. |
| NFR-3 | **Data minimisation:** the LLM receives aggregates only, no raw rows, no ids, no token. | Review of tool `facts`; test that facts JSON < 1 KB and has no `customer_id`. |
| NFR-4 | **Speed (estimate):** REST endpoints < 300 ms / 1 s / 2 s (opt/likely/pess); chat turn 2 / 5 / 10 s. Based on: ~1,600 rows max per customer (checked) and typical hosted LLM latency (not checked). **Measure:** time 20 calls of each on the demo laptop. | Timing script in foundation. |
| NFR-5 | **Mobile first:** works at 360–430 px width, no horizontal scroll, touch targets ≥ 44 px. | Manual check in embedded-demo. |
| NFR-6 | **Plain language:** answers ≤ ~120 words, no jargon without a one-line explanation. | Prompt rule; demo review. |
| NFR-7 | **Trust:** each widget shows its source ("Calculated from 142 of your transactions, 1–31 Aug"). | `source` is a required field in every slice DTO. |
| NFR-8 | **Security basics:** API key only on backend; CORS limited to the coach origin; CSP `frame-ancestors` limited to embedded-demo; DTO validation on every input. | Foundation tests + config review. |
| NFR-9 | **Independence:** after the foundation is merged, each slice is built without editing another worker's files. | File-ownership table in `docs/filesystem.md`. |

## 5. Constraints

- Backend: Python + FastAPI (MVC with a services layer). Frontend: React + Vite + TypeScript + plain CSS. Demo host: existing Expo app in `embedded-demo/`.
- Database: SQLite (recommended; team to confirm — see decision 0004).
- LLM: Gemini via function calling (`GEMINI_API_KEY`, model from env `GEMINI_MODEL`).
- Data: synthetic S-Bank dataset (checked 2026-11-14): 3,626,755 transactions, 5,100 customers, 1 account each, 2024-10-01 … 2026-09-30, 15 categories, 36 MCC codes, merchants are ids only (no names). All customers live in postal areas 00/01/02 (capital region).
- 3 workers. Deadline: UNKNOWN (assumed code freeze Sunday 2026-11-15 morning).

## 6. Out of scope

Real login / S-Bank SSO; real PSD2 multi-bank fetch (pitch idea only); encryption at rest and
audit logs (listed as production next steps); mortgage data (`mtg_*.csv`); payments or any action
that moves money; push notifications; languages other than English (Finnish UI = could, later).
