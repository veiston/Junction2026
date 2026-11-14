"""Money is always integer euro cents. Spending rows are stored negative, shown positive."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

Cents = int


def from_euros(euros: str | int | float | Decimal) -> Cents:
    """Convert euros to cents, rounding half away from zero (ingest rule)."""
    value = Decimal(str(euros)) * 100
    return int(value.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def spent(signed_cents: Cents) -> Cents:
    """Spending shown to users is positive: spent = -sum(amount_cents)."""
    return -signed_cents


def format_cents(cents: Cents) -> str:
    """1234 -> '12.34'. Exact inverse of from_euros for display of plain decimals."""
    sign = "-" if cents < 0 else ""
    whole, frac = divmod(abs(cents), 100)
    return f"{sign}{whole}.{frac:02d}"
