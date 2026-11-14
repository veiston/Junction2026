# 0007 — Three-basket classification by spend group

- **Status:** accepted as a draft; thresholds can be tuned.
- **Context:** The dataset has 15 categories and 36 MCC codes, and no merchant names (checked). S-Bank wants three baskets.
- **Decision:** At ingest, flow comes from `transaction_type`, spend_group comes from the MCC (or the type), and the basket comes from the spend_group, using the table in `docs/er.md` §4.2. Examples: groceries, rent, utilities, commute and fuel are mandatory_regular; health and home & tech are mandatory_irregular; restaurants, kiosks, taxis, fun and travel are everyday.
- **Consequences:** the classification is consistent everywhere and explainable ("rule-based, not AI"). Edge cases are accepted (for example, a new phone counts as irregular).
- **Reversibility:** easy. Edit `db/seed/mcc_reference.csv` and re-run ingest.
