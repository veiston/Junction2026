"""Checks that DAO classes read customer data from SQLite."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from models.dao.customer_dao import CustomerDao
from models.dao.monthly_spend_dao import MonthlySpendDao
from models.dao.transaction_dao import TransactionDao
from models.database import Database
from services.ingest_service import ingest_dataset


class DaoTests(unittest.TestCase):
    def test_daos_read_one_customers_data(self) -> None:
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

            customer = CustomerDao(database).get_by_id("CUST00001")
            transactions = TransactionDao(database).get_by_customer_id("CUST00001")
            balance = TransactionDao(database).get_balance_by_date("CUST00001", "2026-09-01")
            monthly_rows = MonthlySpendDao(database).get_by_customer_and_period(
                "CUST00001", "2026-09", "2026-09"
            )

        self.assertEqual("Helsinki", customer.region)
        self.assertEqual(["Restaurants", "Salary"], [transaction.category for transaction in transactions])
        self.assertEqual(250000, balance)
        self.assertEqual(2, len(monthly_rows))


if __name__ == "__main__":
    unittest.main()
