# 0010 — Slices plug in through stub files, never through shared edits

- **Status:** accepted (2026-11-14)
- **Context:** You want three completely independent slices. Normally every slice edits `routes.py`, the tool list and the widget map, which causes merge conflicts.
- **Decision:** For each slice, the foundation pre-creates its controller (every route returns 501), `services/<slice>/tools.py` with `TOOLS = []`, and `src/slices/<slice>/index.ts` with `widgets = {}`, and wires them in once. Slices fill only their own files.
- **Consequences:** zero shared-file edits after the foundation, and slices can merge in any order.
- **Reversibility:** easy.
