"""Loads CSV files with DuckDB and saves clean data in SQLite."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import duckdb

from models.database import Database


SEED_PATH = Path(__file__).resolve().parents[2] / "db" / "seed" / "mcc_reference.csv"


def _load_mcc_seed(path: Path = SEED_PATH) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


MCC_RULES: dict[str, tuple[str, str, str]] = {
    r["mcc"]: (r["spend_group"], r["label"], r["basket"]) for r in _load_mcc_seed()
}

FIXED_RULES = {
    "salary": ("income", "salary", None),
    "other_income": ("income", "other_income", None),
    "investment_withdrawal": ("income", "investment_withdrawal", None),
    "investment_deposit": ("saving", "investment_deposit", None),
    "salary_sweep": ("transfer", "salary_sweep", None),
    "housing_payment": ("spending", "housing", "mandatory_regular"),
    "utilities_payment": ("spending", "utilities", "mandatory_regular"),
}


DEFAULT_TODAY = "2026-09-15"


def ingest_dataset(database: Database, data_path: Path) -> None:
    """Load the provided customer and transaction CSV files into SQLite via DuckDB."""
    database.migrate()
    customers_path = data_path / "tx_customers_junction.csv"
    transactions_path = data_path / "tx_junction_transactions.csv"

    target = database.connect()
    source = duckdb.connect()
    try:
        _clear_imported_data(target)
        _seed_mcc_reference(target)
        target.commit()
        _insert_customers(target, source, customers_path)
        _insert_transactions(target, source, transactions_path)
        _create_monthly_aggregates(target)
        _write_metadata(target)
        target.commit()
    finally:
        source.close()
        target.close()


def _read_csv(source: duckdb.DuckDBPyConnection, path: Path, columns: str):
    return source.execute(
        f"SELECT {columns} FROM read_csv(?, header = true, all_varchar = true)", [str(path)]
    )


def _insert_customers(target, source: duckdb.DuckDBPyConnection, path: Path) -> None:
    rows = _read_csv(
        source,
        path,
        "customer_id, customer_postal_code, customer_age",
    )
    while batch := rows.fetchmany(10_000):
        target.executemany(
            "INSERT INTO customers(customer_id, postal_code, age, age_band, region) VALUES (?, ?, ?, ?, ?)",
            [
                (customer_id, postal_code, int(age), _age_band(int(age)), _region(postal_code))
                for customer_id, postal_code, age in batch
            ],
        )
        target.commit()


def _insert_transactions(target, source: duckdb.DuckDBPyConnection, path: Path) -> None:
    rows = _read_csv(
        source,
        path,
        "customer_id, bank_account_id, tx_date, tx_timestamp, category, tx_amount_eur, "
        "balance_after_eur, transaction_type, merchant_id, mcc_code",
    )
    transaction_id = 1
    while batch := rows.fetchmany(10_000):
        records = []
        for row in batch:
            customer_id, account_id, tx_date, raw_timestamp, category, amount, balance, tx_type, merchant_id, mcc = row
            flow, spend_group, basket = _classify(tx_type, mcc)
            records.append(
                (
                    transaction_id,
                    customer_id,
                    account_id,
                    tx_date,
                    _iso_timestamp(raw_timestamp),
                    category,
                    tx_type,
                    _to_cents(amount),
                    _to_cents(balance),
                    merchant_id or None,
                    mcc or None,
                    spend_group,
                    flow,
                    basket,
                )
            )
            transaction_id += 1
        target.executemany(
            "INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", records
        )
        target.commit()


def _clear_imported_data(target) -> None:
    for table in ("monthly_spend", "transactions", "mcc_reference", "customers"):
        target.execute(f"DELETE FROM {table}")
    target.execute("DELETE FROM meta WHERE key NOT LIKE 'migration:%'")


def _seed_mcc_reference(target) -> None:
    target.executemany(
        "INSERT INTO mcc_reference(mcc, spend_group, label, category, basket) VALUES (?, ?, ?, ?, ?)",
        [(r["mcc"], r["spend_group"], r["label"], r["category"], r["basket"]) for r in _load_mcc_seed()],
    )


def _create_monthly_aggregates(target) -> None:
    target.execute(
        """
        INSERT INTO monthly_spend(customer_id, month, category, spend_group, basket, flow, amount_cents, tx_count)
        SELECT customer_id, substr(tx_date, 1, 7), category, spend_group, coalesce(basket, ''), flow,
               sum(amount_cents), count(*)
        FROM transactions
        GROUP BY customer_id, substr(tx_date, 1, 7), category, spend_group, coalesce(basket, ''), flow
        """
    )


def _write_metadata(target) -> None:
    start, end = target.execute("SELECT min(tx_date), max(tx_date) FROM transactions").fetchone()
    target.executemany(
        "INSERT INTO meta(key, value) VALUES (?, ?)",
        [
            *([("dataset_from", start), ("dataset_to", end)] if start else []),
            ("default_today", DEFAULT_TODAY),
            ("ingested_at", datetime.now(timezone.utc).isoformat()),
        ],
    )


def _classify(tx_type: str, mcc: str | None) -> tuple[str, str, str | None]:
    if tx_type in FIXED_RULES:
        return FIXED_RULES[tx_type]
    group, _, basket = MCC_RULES.get(mcc or "", ("other_retail", "Other shops", "everyday"))
    return "spending", group, basket


def _to_cents(amount: str) -> int:
    return int((Decimal(amount).quantize(Decimal("0.01"), ROUND_HALF_UP) * 100))


def _iso_timestamp(value: str) -> str:
    return datetime.strptime(value, "%d%b%y:%H:%M:%S").isoformat()


def _age_band(age: int) -> str:
    return ("18-24", "25-34", "35-44", "45-54", "55-64", "65+")[
        0 if age <= 24 else 1 if age <= 34 else 2 if age <= 44 else 3 if age <= 54 else 4 if age <= 64 else 5
    ]


def _region(postal_code: str) -> str:
    return {"00": "Helsinki", "01": "Vantaa", "02": "Espoo"}.get(postal_code[:2], "Other")
