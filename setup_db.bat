@echo off
REM Creates the local SQLite database from the challenge CSV files.
setlocal
cd /d "%~dp0"

uv sync --directory backend || exit /b 1
uv run --directory backend python ..\scripts\ingest.py || exit /b 1
