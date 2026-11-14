@echo off
setlocal
cd /d "%~dp0"

if not exist .env (
    echo .env is missing. Run initialize.bat first, then put your GEMINI_API_KEY in .env.
    exit /b 1
)
if not exist db\money_coach.sqlite3 (
    echo db\money_coach.sqlite3 is missing. Run setup_db.bat first.
    exit /b 1
)

echo Starting the backend in its own window. Close that window to stop the backend.
start "Money Coach backend" cmd /k "uv run --directory backend main.py"

set CI=0
echo Starting the app on http://localhost:8081 ...
pnpm --dir frontend exec expo start --web --port 8081
