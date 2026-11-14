# S-Pankki Money Coach

Junction 2026, S-Bank challenge solution

## Prerequisites: UV and pnpm

1. pip install uv
2. npm install -g pnpm

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

### Frontend

1. pnpm
2. Expo with React Native
3. TypeScript
