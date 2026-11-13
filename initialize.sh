#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '%s\n' "$1 not found. Install it: $2"
    exit 1
  fi
}

require uv "https://docs.astral.sh/uv/getting-started/installation/"
require pnpm "https://pnpm.io/installation"

uv sync --directory "$ROOT_DIR/backend"
pnpm --dir "$ROOT_DIR/frontend" install

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi
