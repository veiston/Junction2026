"""In-memory fakes of the repository ports. Fake only what you depend on."""

from tests.fakes.clock import FakeClock
from tests.fakes.fixtures import FIXTURE_CUSTOMER, FIXTURE_TRANSACTIONS, fixture_world
from tests.fakes.repositories import (
    FakeConversationRepository,
    FakeCustomerRepository,
    FakeMonthlySpendRepository,
    FakeTransactionRepository,
)

__all__ = [
    "FIXTURE_CUSTOMER",
    "FIXTURE_TRANSACTIONS",
    "FakeClock",
    "FakeConversationRepository",
    "FakeCustomerRepository",
    "FakeMonthlySpendRepository",
    "FakeTransactionRepository",
    "fixture_world",
]
