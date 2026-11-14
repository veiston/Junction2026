"""Stores and searches reference text embeddings with DuckDB."""

from __future__ import annotations

from pathlib import Path

import duckdb


class RagStore:
    """DuckDB vector store for non-personal financial education/reference text."""

    def __init__(self, path: Path, dimensions: int) -> None:
        if dimensions < 1:
            raise ValueError("dimensions must be positive")
        self.path = path
        self.dimensions = dimensions

    def initialize(self, enable_vss: bool = False) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with duckdb.connect(str(self.path)) as connection:
            connection.execute(
                f"""
                CREATE TABLE IF NOT EXISTS knowledge_chunks (
                    id VARCHAR PRIMARY KEY,
                    content VARCHAR NOT NULL,
                    source VARCHAR NOT NULL,
                    embedding FLOAT[{self.dimensions}] NOT NULL
                )
                """
            )
            if enable_vss:
                connection.execute("INSTALL vss")
                connection.execute("LOAD vss")
                connection.execute("SET hnsw_enable_experimental_persistence = true")
                connection.execute(
                    "CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw "
                    "ON knowledge_chunks USING HNSW (embedding) WITH (metric = 'cosine')"
                )

    def upsert(self, chunk_id: str, content: str, source: str, embedding: list[float]) -> None:
        self._validate_embedding(embedding)
        with duckdb.connect(str(self.path)) as connection:
            connection.execute("DELETE FROM knowledge_chunks WHERE id = ?", [chunk_id])
            connection.execute(
                "INSERT INTO knowledge_chunks VALUES (?, ?, ?, ?)",
                [chunk_id, content, source, embedding],
            )

    def search(self, embedding: list[float], limit: int = 5) -> list[tuple[str, str, str]]:
        self._validate_embedding(embedding)
        if limit < 1:
            raise ValueError("limit must be positive")
        with duckdb.connect(str(self.path)) as connection:
            rows = connection.execute(
                f"""
                SELECT id, content, source
                FROM knowledge_chunks
                ORDER BY array_cosine_distance(embedding, ?::FLOAT[{self.dimensions}])
                LIMIT ?
                """,
                [embedding, limit],
            ).fetchall()
        return [(row[0], row[1], row[2]) for row in rows]

    def _validate_embedding(self, embedding: list[float]) -> None:
        if len(embedding) != self.dimensions:
            raise ValueError(f"expected embedding with {self.dimensions} dimensions")
