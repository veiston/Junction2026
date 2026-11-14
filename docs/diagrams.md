# Diagrams (index)

All diagrams are Mermaid, and each lives next to the text that explains it. This page lists them
and repeats the two most important ones.

| Diagram | Where |
|---|---|
| Embedding and runtime view | `architecture.md` §4 |
| Option A — MVC + services (chosen) | `architecture.md` §2 |
| Option B — Hexagonal | `architecture.md` §2 |
| Option C — Text-to-SQL (rejected) | `architecture.md` §2 |
| Use-case overview | `use-cases.md` |
| Global ER | `er.md` §1 |
| Ports map | `contracts/ports.md` |
| Build order of slices | `vertical-slices.md` |
| Sequence: foundation walking skeleton | `vertical-slices.md` Slice 0 |
| Sequence: Understand quick action | `vertical-slices.md` Slice 1 |
| Sequence: Plan what-if | `vertical-slices.md` Slice 2 |
| Sequence: Habits accept a limit | `vertical-slices.md` Slice 3 |

## Layers and dependency direction (chosen architecture)

```mermaid
flowchart TB
  FE[frontend: chat + slice widgets] -->|HTTP DTOs| C[controllers]
  C --> S[services]
  C --> O[chat orchestrator]
  O --> T[slice AI tools]
  T --> S
  S --> P[(repository ports)]
  O --> L[(LlmClient port)]
  DBA[SQLite adapters] -. implements .-> P
  GA[Gemini adapter] -. implements .-> L
```

## Chat turn

```mermaid
sequenceDiagram
  participant CO as coach
  participant C as chat_controller
  participant OR as Orchestrator
  participant G as LlmClient (Gemini)
  participant T as AiTool (slice)
  participant S as Service
  CO->>C: POST /chat + Bearer
  C->>C: verify token → customer_id
  C->>OR: handle(customer_id, req)
  loop max 4 rounds
    OR->>G: history + tool specs
    G-->>OR: tool_calls
    OR->>T: run(ctx{customer_id,today}, args)
    T->>S: service method
    S-->>T: DTO
    T-->>OR: facts + widgets + sources
    OR->>G: facts only
  end
  G-->>OR: final text
  OR-->>C: AssistantMessage
  C-->>CO: ChatResponse
```
