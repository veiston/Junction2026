@echo off
setlocal
cd /d "%~dp0"

if not exist db\money_coach.sqlite3 (
    echo db\money_coach.sqlite3 is missing. Build it first: uv run --directory backend python ..\scripts\ingest.py
    exit /b 1
)

start "backend" /b uv run --directory backend main.py
set CI=1
pnpm --dir frontend exec expo start --web --port 8081
