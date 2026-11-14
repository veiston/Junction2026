"""Shared SQLite helpers for the repositories."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from contracts.dto.transactions import Transaction

FIXED_LABELS = {
    "salary": "Salary",
    "other_income": "Other income",
    "investment_withdrawal": "Investment withdrawal",
    "investment_deposit": "Investment deposit",
    "salary_sweep": "Transfer to own account",
    "housing": "Rent / housing",
    "utilities": "Utilities",
}

TX_COLUMNS = (
    "t.id, t.tx_date, t.tx_timestamp, t.category, t.spend_group, t.amount_cents, "
    "t.balance_after_cents, t.flow, t.basket, t.merchant_id, t.mcc, "
    "(SELECT m.label FROM mcc_reference m WHERE m.mcc = t.mcc) AS mcc_label"
)


def row_to_transaction(r: sqlite3.Row | tuple) -> Transaction:
    ts = datetime.fromisoformat(r[2])
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    label = r[11] or FIXED_LABELS.get(r[4]) or "Other shops"
    return Transaction(
        id=r[0], date=r[1], timestamp=ts, category=r[3], spend_group=r[4], label=label,
        amount_cents=r[5], balance_after_cents=r[6], flow=r[7], basket=r[8] or None,
        merchant_id=r[9] or None, mcc=r[10] or None,
    )
