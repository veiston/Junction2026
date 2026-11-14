"""Builds the small demo database that ships with the deployed backend.

The full database (about 1 GB) is too big for git and for Vercel. The demo only needs the demo
customer, a sample of their peer group (for the peer benchmark) and the reference tables.

    python3 scripts/make_demo_db.py [--source db/money_coach.sqlite3] [--customer CUST02706] [--peers 150]
"""
from __future__ import annotations

import argparse
import shutil
import sqlite3
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "db" / "money_coach.sqlite3"
OUTPUT = ROOT / "backend" / "demo_data" / "money_coach_demo.sqlite3"
# Peers only need their current-month transactions: older months come from monthly_spend.
PEER_TX_FROM = "2026-09-01"
COPIED_WHOLE = ("mcc_reference", "meta")
EMPTY = ("conversations", "messages", "spending_limits", "challenges")


def build(source: Path, output: Path, customer_id: str, peers: int) -> None:
    # Build in a temp folder, then copy: a half-built file never replaces the real one.
    workdir = Path(tempfile.mkdtemp())
    built = workdir / output.name
    db = sqlite3.connect(built)
    db.execute("ATTACH DATABASE ? AS src", (f"file:{source}?mode=ro",))
    schema = db.execute(
        "SELECT type, name, sql FROM src.sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' "
        "ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END"
    ).fetchall()
    for _, _, sql in schema:
        db.execute(sql)

    band, region = db.execute(
        "SELECT age_band, region FROM src.customers WHERE customer_id = ?", (customer_id,)
    ).fetchone()
    db.execute("CREATE TEMP TABLE keep(customer_id TEXT PRIMARY KEY)")
    db.execute("INSERT INTO keep VALUES (?)", (customer_id,))
    db.execute(
        "INSERT OR IGNORE INTO keep SELECT customer_id FROM src.customers "
        "WHERE age_band = ? AND region = ? ORDER BY customer_id LIMIT ?",
        (band, region, peers),
    )
    db.execute("INSERT INTO customers SELECT * FROM src.customers WHERE customer_id IN (SELECT customer_id FROM keep)")
    db.execute("INSERT INTO monthly_spend SELECT * FROM src.monthly_spend WHERE customer_id IN (SELECT customer_id FROM keep)")
    db.execute(
        "INSERT INTO transactions SELECT * FROM src.transactions "
        "WHERE customer_id = ? OR (customer_id IN (SELECT customer_id FROM keep) AND tx_date >= ?)",
        (customer_id, PEER_TX_FROM),
    )
    for table in COPIED_WHOLE:
        db.execute(f"INSERT INTO {table} SELECT * FROM src.{table}")
    db.commit()
    db.execute("DETACH DATABASE src")
    db.execute("VACUUM")
    db.close()
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(built, output)
    shutil.rmtree(workdir)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--customer", default="CUST02706")
    parser.add_argument("--peers", type=int, default=150)
    args = parser.parse_args()
    build(args.source, OUTPUT, args.customer, args.peers)
    print(f"wrote {OUTPUT} ({OUTPUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
