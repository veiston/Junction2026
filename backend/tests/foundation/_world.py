"""Builds the same tiny world in a fake and in a real SQLite repo set (via the real ingest)."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from models.database import Database
from models.repositories.clock import DemoClock
from models.repositories.sqlite_conversation_repo import SqliteConversationRepository
from models.repositories.sqlite_customer_repo import SqliteCustomerRepository
from models.repositories.sqlite_monthly_spend_repo import SqliteMonthlySpendRepository
from models.repositories.sqlite_transaction_repo import SqliteTransactionRepository
from services.ingest_service import ingest_dataset

CUSTOMERS = "customer_id,customer_postal_code,customer_age\nCUST00001,00990,30\nCUST00002,01200,30\nCUST00003,02100,50\n"
HEADER = ("customer_id,bank_account_id,tx_date,tx_timestamp,category,tx_amount_eur,"
          "balance_after_eur,transaction_type,merchant_id,mcc_code\n")

# customer, date, category, amount, balance, type, mcc
ROWS = [
    ("CUST00001", "2026-08-01", "Salary", "2500.00", "2500.00", "salary", ""),
    ("CUST00001", "2026-08-05", "Groceries", "-60.00", "2440.00", "purchase", "5411"),
    ("CUST00001", "2026-09-02", "Restaurants", "-12.50", "2427.50", "purchase", "5812"),
    ("CUST00001", "2026-09-10", "Groceries", "-40.00", "2387.50", "purchase", "5411"),
    ("CUST00001", "2026-09-20", "Groceries", "-99.00", "2288.50", "purchase", "5411"),  # after today
    ("CUST00002", "2026-09-03", "Restaurants", "-777.00", "1000.00", "purchase", "5812"),
]


def write_csvs(directory: Path, rows=ROWS, customers: str = CUSTOMERS) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "tx_customers_junction.csv").write_text("﻿" + customers, encoding="utf-8")
    lines = [
        f"{c},ACC1,{d},{date.fromisoformat(d).strftime('%d%b%y').upper()}:09:00:00,{cat},{amt},{bal},{t},"
        f"{'M1' if mcc else ''},{mcc}"
        for c, d, cat, amt, bal, t, mcc in rows
    ]
    (directory / "tx_junction_transactions.csv").write_text("﻿" + HEADER + "\n".join(lines) + "\n", encoding="utf-8")
    return directory


def sqlite_world(root: Path, today: date = date(2026, 9, 15)):
    db = Database(root / "t.sqlite3")
    ingest_dataset(db, write_csvs(root / "data"))
    clock = DemoClock(today)
    tx = SqliteTransactionRepository(db, clock)
    return (clock, SqliteCustomerRepository(db), tx, SqliteMonthlySpendRepository(db, clock),
            SqliteConversationRepository(db), db)
