"""In-memory fakes implementing the repository Protocols of contracts/interfaces/repositories/shared.py."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timezone

from contracts.dto.transactions import Transaction, TransactionFilter, TransactionPage
from contracts.interfaces.repositories.shared import (
    Clock,
    CustomerRecord,
    MonthlySpendRow,
    StoredMessage,
    SumResult,
)


class FakeCustomerRepository:
    def __init__(self, customers: list[CustomerRecord]) -> None:
        self._by_id = {c.customer_id: c for c in customers}

    def get(self, customer_id: str) -> CustomerRecord | None:
        return self._by_id.get(customer_id)

    def ids_in_group(self, age_band: str, region: str | None) -> list[str]:
        return [
            c.customer_id
            for c in self._by_id.values()
            if c.age_band == age_band and (region is None or c.region == region)
        ]


class FakeTransactionRepository:
    def __init__(self, clock: Clock, by_customer: dict[str, list[Transaction]]) -> None:
        self._clock = clock
        self._by_customer = by_customer

    def _visible(self, customer_id: str) -> list[Transaction]:
        today = self._clock.today()
        return [t for t in self._by_customer.get(customer_id, []) if t.date <= today]

    def _filtered(self, customer_id: str, flt: TransactionFilter) -> list[Transaction]:
        today = self._clock.today()
        # Default period: the current month up to today.
        from_date = flt.from_date or today.replace(day=1)
        to_date = min(flt.to_date or today, today)
        rows = []
        for t in self._visible(customer_id):
            if not (from_date <= t.date <= to_date):
                continue
            if flt.basket is not None and t.basket != flt.basket:
                continue
            if flt.category is not None and t.category != flt.category:
                continue
            if flt.spend_group is not None and t.spend_group != flt.spend_group:
                continue
            if flt.flow is not None and t.flow != flt.flow:
                continue
            if flt.min_abs_amount_cents is not None and abs(t.amount_cents) < flt.min_abs_amount_cents:
                continue
            rows.append(t)
        return rows

    def page(self, customer_id: str, flt: TransactionFilter, page: int, page_size: int) -> TransactionPage:
        rows = sorted(self._filtered(customer_id, flt), key=lambda t: (t.timestamp, t.id), reverse=True)
        start = (page - 1) * page_size
        return TransactionPage(
            items=rows[start : start + page_size],
            page=page,
            page_size=page_size,
            total=len(rows),
            total_amount_cents=sum(t.amount_cents for t in rows),
        )

    def sum(self, customer_id: str, flt: TransactionFilter) -> SumResult:
        rows = self._filtered(customer_id, flt)
        return SumResult(amount_cents=sum(t.amount_cents for t in rows), tx_count=len(rows))

    def all_between(self, customer_id: str, from_date: date, to_date: date) -> list[Transaction]:
        rows = [t for t in self._visible(customer_id) if from_date <= t.date <= to_date]
        return sorted(rows, key=lambda t: (t.timestamp, t.id))

    def balance_on(self, customer_id: str, day: date) -> int:
        rows = [t for t in self._visible(customer_id) if t.date <= day]
        if not rows:
            return 0
        return max(rows, key=lambda t: (t.timestamp, t.id)).balance_after_cents


class FakeMonthlySpendRepository:
    """Aggregates the fake transactions on the fly (the real one reads a table built at ingest)."""

    def __init__(self, clock: Clock, transactions: FakeTransactionRepository) -> None:
        self._clock = clock
        self._tx = transactions

    def for_customer(self, customer_id: str, from_month: str, to_month: str) -> list[MonthlySpendRow]:
        groups: dict[tuple, list[int]] = defaultdict(lambda: [0, 0])
        for t in self._tx._visible(customer_id):
            month = t.date.strftime("%Y-%m")
            if not (from_month <= month <= to_month):
                continue
            key = (month, t.category, t.spend_group, t.basket, t.flow)
            groups[key][0] += t.amount_cents
            groups[key][1] += 1
        return [
            MonthlySpendRow(month=m, category=c, spend_group=g, basket=b, flow=f, amount_cents=a, tx_count=n)
            for (m, c, g, b, f), (a, n) in sorted(groups.items(), key=lambda kv: tuple(str(x) for x in kv[0]))
        ]

    def for_customers(
        self, customer_ids: list[str], from_month: str, to_month: str
    ) -> list[tuple[str, MonthlySpendRow]]:
        return [(cid, row) for cid in customer_ids for row in self.for_customer(cid, from_month, to_month)]


class FakeConversationRepository:
    def __init__(self) -> None:
        self._owner: dict[str, str] = {}
        self._messages: dict[str, list[StoredMessage]] = {}

    def create(self, customer_id: str) -> str:
        cid = f"c_{uuid.uuid4().hex[:8]}"
        self._owner[cid] = customer_id
        self._messages[cid] = []
        return cid

    def owner_of(self, conversation_id: str) -> str | None:
        return self._owner.get(conversation_id)

    def append(self, conversation_id: str, role: str, text: str, widgets_json: str = "[]") -> None:
        self._messages[conversation_id].append(
            StoredMessage(role=role, text=text, widgets_json=widgets_json,
                          created_at=datetime.now(timezone.utc).isoformat())
        )

    def recent(self, conversation_id: str, limit: int = 10) -> list[StoredMessage]:
        return self._messages.get(conversation_id, [])[-limit:]
