"""TransactionService: validates the filter and paging, delegates to the repository."""
from __future__ import annotations

from datetime import timedelta

from contracts.dto.transactions import TransactionFilter, TransactionPage
from contracts.interfaces.controllers.errors import ValidationFailed
from contracts.interfaces.repositories.shared import Clock, TransactionRepository
from services.session_service import DATA_FROM

MAX_RANGE_DAYS = 366


class TransactionServiceImpl:
    def __init__(self, transactions: TransactionRepository, clock: Clock) -> None:
        self._tx = transactions
        self._clock = clock

    def list(self, customer_id: str, flt: TransactionFilter, page: int, page_size: int) -> TransactionPage:
        if page < 1:
            raise ValidationFailed("page must be >= 1.", [{"field": "page", "issue": "must be >= 1"}])
        if not 1 <= page_size <= 100:
            raise ValidationFailed("page_size must be 1..100.", [{"field": "page_size", "issue": "must be 1..100"}])
        today = self._clock.today()
        if flt.from_date is not None and not (DATA_FROM <= flt.from_date <= today):
            raise ValidationFailed(
                f"from_date must be within {DATA_FROM}..{today}.",
                [{"field": "from_date", "issue": "out of range"}],
            )
        if flt.from_date and flt.to_date:
            if flt.from_date > flt.to_date:
                raise ValidationFailed("from_date must not be after to_date.",
                                       [{"field": "from_date", "issue": "after to_date"}])
            if flt.to_date - flt.from_date > timedelta(days=MAX_RANGE_DAYS - 1):
                raise ValidationFailed("Date range is limited to 366 days.",
                                       [{"field": "to_date", "issue": "range too long"}])
        return self._tx.page(customer_id, flt, page, page_size)
