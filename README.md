# S-Pankki Money Coach

Junction 2026, S-Bank challenge solution

## Prerequisites: UV, pnpm and Ollama

1. pip install uv
2. npm install -g pnpm
3. Install [Ollama](https://ollama.com/) and run ``ollama pull gemma4:e4b``

## Run it

``./download.sh && ./initialize.sh && ./run.sh``

Delete the `.csv` files and run `download.bat` or `download.sh` to download the full data.

## Set up the database

Run `./setup_db.sh` on macOS/Linux or `setup_db.bat` on Windows.
It creates the local SQLite database from the challenge CSV files.

## Tech Stack

### Backend

1. UV
2. Python
3. FastAPI: ``POST /chat`` (Gemini) and ``POST /chat/local`` (Ollama, gemma4:e4b)

### Frontend

1. pnpm
2. Expo with React Native
3. TypeScript
