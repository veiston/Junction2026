-- Creates the main customer and transaction data tables.
CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY NOT NULL,
    postal_code TEXT NOT NULL,
    age INTEGER NOT NULL,
    age_band TEXT NOT NULL,
    region TEXT NOT NULL
);

CREATE TABLE mcc_reference (
    mcc TEXT PRIMARY KEY NOT NULL,
    spend_group TEXT NOT NULL,
    label TEXT NOT NULL,
    category TEXT NOT NULL,
    basket TEXT NOT NULL
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    account_id TEXT NOT NULL,
    tx_date TEXT NOT NULL,
    tx_timestamp TEXT NOT NULL,
    category TEXT NOT NULL,
    tx_type TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    balance_after_cents INTEGER NOT NULL,
    merchant_id TEXT,
    mcc TEXT,
    spend_group TEXT NOT NULL,
    flow TEXT NOT NULL,
    basket TEXT
);
CREATE INDEX transactions_customer_date_idx ON transactions(customer_id, tx_date, id);
CREATE INDEX transactions_customer_group_idx ON transactions(customer_id, spend_group, tx_date);

CREATE TABLE monthly_spend (
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    spend_group TEXT NOT NULL,
    basket TEXT NOT NULL DEFAULT '',
    flow TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    tx_count INTEGER NOT NULL,
    PRIMARY KEY (customer_id, month, category, spend_group, basket, flow)
);

CREATE TABLE meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
