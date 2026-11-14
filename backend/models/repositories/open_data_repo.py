"""OpenDataRepository over a static, pre-downloaded Statistics Finland JSON file (no live API call)."""

from __future__ import annotations

import json
from pathlib import Path

from contracts.dto.understand import OpenDataReference
from models.database import db_dir

DEFAULT_PATH = db_dir() / "seed" / "statfin_household_spending.json"


class JsonOpenDataRepository:
    def __init__(self, path: Path = DEFAULT_PATH) -> None:
        self._by_category: dict[str, OpenDataReference] = {}
        if not path.is_file():
            return  # optional data (US-U6): no file = no reference shown
        doc = json.loads(path.read_text(encoding="utf-8"))
        for row in doc.get("rows", []):
            self._by_category[row["category"]] = OpenDataReference(
                label=row["label"],
                share_of_spending_pct=float(row["share_of_spending_pct"]),
                year=int(doc["year"]),
                source_url=doc["source_url"],
            )

    def household_share(self, category: str) -> OpenDataReference | None:
        return self._by_category.get(category)
