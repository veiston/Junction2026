-- Creates tables for saved chat conversations and messages.
CREATE TABLE conversations (
    id TEXT PRIMARY KEY NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    created_at TEXT NOT NULL
);
CREATE INDEX conversations_customer_idx ON conversations(customer_id, created_at);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    text TEXT NOT NULL,
    widgets_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);
CREATE INDEX messages_conversation_idx ON messages(conversation_id, id);
