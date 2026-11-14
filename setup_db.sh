#!/usr/bin/env bash
# Creates the local SQLite database from the challenge CSV files.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

uv sync --directory backend
uv run --directory backend python ../scripts/ingest.py
