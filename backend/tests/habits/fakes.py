"""In-memory fakes of LimitRepository and ChallengeRepository."""

from __future__ import annotations

from dataclasses import replace

from contracts.interfaces.repositories.habits import ChallengeRecord, LimitRecord


class FakeLimitRepository:
    def __init__(self) -> None:
        self.rows: list[LimitRecord] = []

    def create(self, customer_id: str, month: str, amount_cents: int) -> LimitRecord:
        rec = LimitRecord(len(self.rows) + 1, customer_id, month, "everyday", amount_cents, "active",
                          "2026-09-15T00:00:00+00:00")
        self.rows.append(rec)
        return rec

    def active_for_month(self, customer_id: str, month: str) -> LimitRecord | None:
        found = [r for r in self.rows if r.customer_id == customer_id and r.month == month and r.status == "active"]
        return found[-1] if found else None

    def get(self, customer_id: str, limit_id: int) -> LimitRecord | None:
        return next((r for r in self.rows if r.id == limit_id and r.customer_id == customer_id), None)

    def set_status(self, customer_id: str, limit_id: int, status: str) -> None:
        self.rows = [replace(r, status=status) if r.id == limit_id and r.customer_id == customer_id else r
                     for r in self.rows]


class FakeChallengeRepository:
    def __init__(self) -> None:
        self.rows: list[ChallengeRecord] = []

    def create(self, record: ChallengeRecord) -> ChallengeRecord:
        rec = replace(record, id=len(self.rows) + 1)
        self.rows.append(rec)
        return rec

    def list(self, customer_id: str) -> list[ChallengeRecord]:
        return [r for r in reversed(self.rows) if r.customer_id == customer_id]

    def active_with_template(self, customer_id: str, template_id: str) -> ChallengeRecord | None:
        found = [r for r in self.rows if r.customer_id == customer_id and r.template_id == template_id
                 and r.status == "active"]
        return found[-1] if found else None

    def set_status(self, customer_id: str, challenge_id: int, status: str) -> None:
        self.rows = [replace(r, status=status) if r.id == challenge_id and r.customer_id == customer_id else r
                     for r in self.rows]
