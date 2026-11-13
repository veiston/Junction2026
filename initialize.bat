@echo off
setlocal
cd /d "%~dp0"

:: Initialize UV and pnpm
uv sync --directory backend || exit /b 1
pnpm --dir frontend install || exit /b 1

if not exist .env (
    copy .env.example .env >nul
)
