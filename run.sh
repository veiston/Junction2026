#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
trap 'kill 0' EXIT

uv run --directory backend main.py &
pnpm --dir frontend dev
