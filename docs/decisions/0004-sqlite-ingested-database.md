# 0004 — Load the dataset once into SQLite

- **Status:** PROPOSED. The team still chooses between SQLite and MariaDB.
- **Context:** The CSV is 362 MB with 3,626,755 rows (checked). Reading it per request is too slow. Every query is for one customer (148–1,543 rows, checked).
- **Decision:** `scripts/ingest.py` reads the CSVs once, applies the classification (0007), builds `monthly_spend`, and writes `db/money_coach.sqlite3` with an index on `(customer_id, tx_date)`. App state (chat, limits, challenges) goes in the same file.
- **Why not MariaDB:** it needs a server or Docker on all 3 machines and gives a single-user demo no benefit.
- **Consequences:** zero setup and fast per-customer queries. Concurrent writes are limited (fine for a demo). Ingest time is UNKNOWN; measure it on the first run.
- **Reversibility:** easy. Only the repository adapters change.
