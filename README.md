# S-Pankki Money Coach

Junction 2026, S-Bank challenge solution

## Prerequisites: UV and pnpm

1. pip install uv
2. npm install -g pnpm

## Run it

First time only:

| Step | macOS / Linux | Windows (cmd or PowerShell) |
|---|---|---|
| 1. Download the data | `./download.sh` | `download.bat` |
| 2. Install everything | `./initialize.sh` | `initialize.bat` |
| 3. Put your Gemini key in `.env` | open `.env`, set `GEMINI_API_KEY=your_key` | same (`.env` is created by step 2) |
| 4. Build the database | `./setup_db.sh` | `setup_db.bat` |

Every time:

| macOS / Linux | Windows |
|---|---|
| `./run.sh` | `run.bat` |

Then open http://localhost:8081 and tap the AI tab. Stop with `Ctrl+C`.

If the `.csv` files in `Challenge data` are broken, delete them and run the download step again.
The database step takes a few minutes. If `db/money_coach.sqlite3` already exists you can skip steps 1 and 4.

## Tech Stack

### Backend

1. UV
2. Python

### Frontend

1. pnpm
2. Expo with React Native
3. TypeScript
