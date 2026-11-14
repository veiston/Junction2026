#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f db/money_coach.sqlite3 ]; then
  echo "db/money_coach.sqlite3 is missing. Build it first:  uv run --directory backend python ../scripts/ingest.py" >&2
  exit 1
fi

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

trap 'kill 0' EXIT

uv run --directory backend main.py &                                  # backend   :8000
pnpm --dir frontend dev &                                             # coach     :5173
CI=1 pnpm --dir embedded-demo exec expo start --web --port 8081 &     # embedded demo :8081
wait
