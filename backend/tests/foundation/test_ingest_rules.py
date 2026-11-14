"""Ingest rules from docs/er.md section 4, on hand-written rows."""

from __future__ import annotations

import sqlite3

import pytest

from models.database import Database
from services.ingest_service import ingest_dataset
from tests.foundation._world import CUSTOMERS, write_csvs

TYPES = [  # (transaction_type, category, mcc, flow, spend_group, basket)
    ("salary", "Salary", "", "income", "salary", None),
    ("other_income", "Other Income", "", "income", "other_income", None),
    ("investment_withdrawal", "Invest Withdraw", "", "income", "investment_withdrawal", None),
    ("investment_deposit", "Invest Deposit", "", "saving", "investment_deposit", None),
    ("salary_sweep", "Salary Sweep", "", "transfer", "salary_sweep", None),
    ("housing_payment", "Housing", "", "spending", "housing", "mandatory_regular"),
    ("utilities_payment", "Utilities", "", "spending", "utilities", "mandatory_regular"),
    ("purchase", "Groceries", "5411", "spending", "supermarkets", "mandatory_regular"),
    ("purchase", "Health", "5912", "spending", "pharmacy", "mandatory_irregular"),
    ("purchase", "Restaurants", "5812", "spending", "restaurants", "everyday"),
    ("purchase", "Home & Tech", "5734", "spending", "software_apps", "everyday"),  # exception inside Home & Tech
    ("purchase", "Groceries", "5499", "spending", "kiosks", "everyday"),  # exception inside Groceries
    ("purchase", "Transportation", "5542", "spending", "fuel", "mandatory_regular"),
    ("purchase", "Lifestyle", "5691", "spending", "clothing", "everyday"),
    ("purchase", "Lifestyle", "9999", "spending", "other_retail", "everyday"),  # unknown MCC
]


@pytest.fixture
def db(tmp_path):
    rows = [
        ("CUST00001", f"2026-09-{i + 1:02d}", cat, "-10.00", "100.00", t, mcc)
        for i, (t, cat, mcc, *_rest) in enumerate(TYPES)
    ]
    database = Database(tmp_path / "t.sqlite3")
    ingest_dataset(database, write_csvs(tmp_path / "d", rows))
    return database


def test_classification_rules(db):
    with db.session() as con:
        got = con.execute("SELECT tx_type, category, mcc, flow, spend_group, basket FROM transactions ORDER BY id").fetchall()
    for (t, cat, mcc, flow, group, basket), row in zip(TYPES, got):
        assert row == (t, cat, mcc or None, flow, group, basket)


def test_basket_only_for_spending(db):
    with db.session() as con:
        assert con.execute("SELECT count(*) FROM transactions WHERE (flow = 'spending') != (basket IS NOT NULL)").fetchone()[0] == 0


def test_cents_rounding_half_up(tmp_path):
    rows = [("CUST00001", "2026-09-01", "Groceries", "-0.125", "10.005", "purchase", "5411"),
            ("CUST00001", "2026-09-02", "Groceries", "-12.34", "1.10", "purchase", "5411")]
    database = Database(tmp_path / "t.sqlite3")
    ingest_dataset(database, write_csvs(tmp_path / "d", rows))
    with database.session() as con:
        assert con.execute("SELECT amount_cents, balance_after_cents FROM transactions ORDER BY id").fetchall() == [(-13, 1001), (-1234, 110)]


def test_region_and_age_band(tmp_path):
    customers = "customer_id,customer_postal_code,customer_age\n" + "\n".join(
        f"C{i:02d},{p},{a}" for i, (p, a) in enumerate(
            [("00100", 18), ("01200", 24), ("02100", 25), ("09999", 34), ("00100", 35), ("00100", 44),
             ("00100", 45), ("00100", 54), ("00100", 55), ("00100", 64), ("00100", 65), ("00100", 90)])
    ) + "\n"
    database = Database(tmp_path / "t.sqlite3")
    ingest_dataset(database, write_csvs(tmp_path / "d", [], customers))
    with database.session() as con:
        got = con.execute("SELECT region, age_band FROM customers ORDER BY customer_id").fetchall()
    assert [r for r, _ in got][:4] == ["Helsinki", "Vantaa", "Espoo", "Other"]
    assert [b for _, b in got] == ["18-24", "18-24", "25-34", "25-34", "35-44", "35-44", "45-54", "45-54",
                                    "55-64", "55-64", "65+", "65+"]


def test_monthly_spend_and_meta(db):
    with db.session() as con:
        total_tx = con.execute("SELECT count(*), sum(amount_cents) FROM transactions").fetchone()
        agg = con.execute("SELECT sum(tx_count), sum(amount_cents) FROM monthly_spend").fetchone()
        assert tuple(agg) == tuple(total_tx)
        assert con.execute("SELECT count(*) FROM monthly_spend WHERE flow != 'spending' AND basket != ''").fetchone()[0] == 0
    assert db.meta("dataset_from") == "2026-09-01"
    assert db.meta("dataset_to") == "2026-09-15"
    assert db.meta("default_today") == "2026-09-15"


def test_mcc_reference_seeded_with_categories(db):
    with db.session() as con:
        assert con.execute("SELECT count(*) FROM mcc_reference").fetchone()[0] == 36
        assert con.execute("SELECT count(*) FROM mcc_reference WHERE category = ''").fetchone()[0] == 0


def test_ingest_is_idempotent(tmp_path):
    database = Database(tmp_path / "t.sqlite3")
    data = write_csvs(tmp_path / "d", [("CUST00001", "2026-09-01", "Groceries", "-5.00", "95.00", "purchase", "5411")])

    def snapshot():
        with database.session() as con:
            return {t: con.execute(f"SELECT * FROM {t} ORDER BY 1,2").fetchall()
                    for t in ("customers", "transactions", "monthly_spend", "mcc_reference")}, \
                   con.execute("SELECT key FROM meta ORDER BY key").fetchall()

    ingest_dataset(database, data)
    first = snapshot()
    ingest_dataset(database, data)
    assert snapshot() == first
