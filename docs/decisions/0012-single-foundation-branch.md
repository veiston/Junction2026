# 0012 — The foundation is one branch built by one worker

- **Status:** accepted (2026-11-14)
- **Context:** The SDF says one task, one branch. You decided one person builds the whole foundation in one branch, and later.
- **Decision:** branch `foundation`, with one conventional commit per layer. Slice work keeps one branch per task (`<slice>-<layer>`).
- **Consequences:** less PR overhead early. The foundation PR is large, so review it commit by commit.
- **Reversibility:** easy.
