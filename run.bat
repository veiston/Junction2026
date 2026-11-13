@echo off
setlocal

set "ROOT_DIR=%~dp0"

start "backend" /b uv run --directory "%ROOT_DIR%backend" main.py
pnpm --dir "%ROOT_DIR%frontend" dev
