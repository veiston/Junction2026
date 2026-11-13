@echo off
setlocal
cd /d "%~dp0"

start "backend" /b uv run --directory backend main.py
pnpm --dir frontend dev
