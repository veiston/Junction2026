# 0001 — Docs and contracts go first, on their own branch

- **Status:** accepted (2026-11-14)
- **Context:** Three workers must build independent slices. They can only do that if they share the same frozen contracts first. The SDF puts the plan on `docs/plan` behind a PR. You first wanted `docs/` and `contracts/` straight on `main`, then asked for "only contracts and docs, in a branch".
- **Decision:** `docs/` and `contracts/` are committed on branch `docs/plan`, and nothing else is. Merging it into `main` is the approval gate. The foundation branch starts from `main` after that merge.
- **Consequences:** workers never start from unapproved contracts. The foundation code is a separate, later step.
- **Reversibility:** easy.
