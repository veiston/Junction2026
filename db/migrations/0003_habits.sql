-- Creates tables for monthly spending limits and challenges.
CREATE TABLE IF NOT EXISTS spending_limits (
    id INTEGER PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    month TEXT NOT NULL,
    basket TEXT NOT NULL DEFAULT 'everyday' CHECK (basket = 'everyday'),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS spending_limits_customer_idx ON spending_limits(customer_id, month);

CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    spend_group TEXT NOT NULL,
    rule_kind TEXT NOT NULL CHECK (rule_kind IN ('zero_spend', 'max_amount', 'max_count')),
    rule_amount_cents INTEGER,
    rule_count INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS challenges_customer_idx ON challenges(customer_id, id);
