"""Checks that CSV data is loaded and classified correctly."""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from models.database import Database
from services.ingest_service import ingest_dataset


class IngestTests(unittest.TestCase):
    def test_ingest_classifies_transactions_and_creates_monthly_aggregates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / "data"
            data.mkdir()
            (data / "tx_customers_junction.csv").write_text(
                "\ufeffcustomer_id,customer_postal_code,customer_age\nCUST00001,00990,30\n",
                encoding="utf-8",
            )
            (data / "tx_junction_transactions.csv").write_text(
                "\ufeffcustomer_id,bank_account_id,tx_date,tx_timestamp,category,tx_amount_eur,"
                "balance_after_eur,transaction_type,merchant_id,mcc_code\n"
                "CUST00001,ACC1,2026-09-01,01SEP26:09:00:00,Salary,2500.00,2500.00,salary,,\n"
                "CUST00001,ACC1,2026-09-02,02SEP26:09:00:00,Restaurants,-12.50,2487.50,purchase,M1,5812\n",
                encoding="utf-8",
            )
            database = Database(root / "money_coach.sqlite3")

            ingest_dataset(database, data)

            connection = sqlite3.connect(database.path)
            try:
                rows = connection.execute(
                    "SELECT flow, spend_group, basket, amount_cents FROM transactions ORDER BY id"
                ).fetchall()
                aggregate = connection.execute(
                    "SELECT amount_cents, tx_count FROM monthly_spend "
                    "WHERE customer_id = 'CUST00001' AND spend_group = 'restaurants'"
                ).fetchone()
                metadata = dict(connection.execute("SELECT key, value FROM meta"))
            finally:
                connection.close()

        self.assertEqual(
            [
                ("income", "salary", None, 250000),
                ("spending", "restaurants", "everyday", -1250),
            ],
            rows,
        )
        self.assertEqual((-1250, 1), aggregate)
        self.assertEqual("2026-09-01", metadata["dataset_from"])
        self.assertEqual("2026-09-02", metadata["dataset_to"])


if __name__ == "__main__":
    unittest.main()
