"""Checks that the RAG text store can find similar reference text."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from services.rag_service import RagStore


class RagStoreTests(unittest.TestCase):
    def test_store_searches_reference_chunks_by_embedding(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = RagStore(Path(directory) / "coach_rag.duckdb", dimensions=3)
            store.initialize()
            store.upsert("budgeting", "Keep a reserve for irregular expenses.", "coach-guide", [1, 0, 0])
            store.upsert("investing", "Diversification reduces concentration risk.", "coach-guide", [0, 1, 0])

            results = store.search([0.9, 0.1, 0], limit=1)

        self.assertEqual([("budgeting", "Keep a reserve for irregular expenses.", "coach-guide")], results)


if __name__ == "__main__":
    unittest.main()
