@echo off
setlocal

set "ROOT_DIR=%~dp0"

where uv >nul 2>nul
if errorlevel 1 (
    echo uv not found. Install it: https://docs.astral.sh/uv/getting-started/installation/
    exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm not found. Install it: https://pnpm.io/installation
    exit /b 1
)

uv sync --directory "%ROOT_DIR%backend" || exit /b 1
pnpm --dir "%ROOT_DIR%frontend" install || exit /b 1

if not exist "%ROOT_DIR%.env" (
    copy "%ROOT_DIR%.env.example" "%ROOT_DIR%.env" >nul
)
