#!/usr/bin/env bash
# Create one git worktree per task of a wave, branching from the local `foundation` branch.
# Usage: scripts/spawn-wave.sh A|B|C     (run from any worktree of this repo)
set -euo pipefail

wave="${1:?usage: spawn-wave.sh A|B|C}"
case "$wave" in
  A) tasks=(models-and-ports adapter-llm frontend-foundation) ;;
  B) tasks=(adapter-db services controllers frontend-hooks) ;;
  C) tasks=(tests) ;;
  *) echo "wave must be A, B or C" >&2; exit 1 ;;
esac

root="$(git rev-parse --show-toplevel)"
for t in "${tasks[@]}"; do
  dir="$root/../Junction2026-$t"
  if [ -e "$dir" ]; then echo "skip $t (exists)"; continue; fi
  git -C "$root" worktree add -b "foundation-$t" "$dir" foundation
  echo "created $dir  (branch foundation-$t)  -> task: docs/tasks/foundation-$t.md"
done
