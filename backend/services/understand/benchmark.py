"""Peer statistics: pure functions (rules in docs/er.md §5.1, 'Peers')."""

from __future__ import annotations

from collections.abc import Sequence

MIN_PEER_GROUP = 30


def quantile(values: Sequence[int], q: float) -> int:
    """Linear-interpolated quantile (same as numpy's default), rounded to whole cents. 0 for no values."""
    if not values:
        return 0
    data = sorted(values)
    pos = (len(data) - 1) * q
    low = int(pos)
    high = min(low + 1, len(data) - 1)
    return round(data[low] + (data[high] - data[low]) * (pos - low))


def percentile_rank(value: int, peers: Sequence[int]) -> int:
    """% of peers with a strictly lower value, 0-100."""
    if not peers:
        return 0
    return round(sum(1 for p in peers if p < value) / len(peers) * 100)
