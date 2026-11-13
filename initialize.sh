#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

# Initialize UV and pnpm
uv sync --directory backend
pnpm --dir frontend install

if [ ! -f .env ]; then
  cp .env.example .env
fi
