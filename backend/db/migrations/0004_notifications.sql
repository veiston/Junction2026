-- Notices behind the bell: one row per notice a customer has had, so it is shown once and stays read.
CREATE TABLE IF NOT EXISTS notifications (
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('spending_change', 'challenge_ended', 'challenge_suggestion')),
    created_date TEXT NOT NULL,
    read_date TEXT,
    payload TEXT NOT NULL,
    PRIMARY KEY (customer_id, id)
);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(customer_id, read_date, created_date);
