from __future__ import annotations

from api.security import CustomerId
from contracts.interfaces.controllers.errors import NotImplementedYet


def not_implemented(_: CustomerId) -> None:
    """Auth is checked first (401 beats 501), then the stub answers 501."""
    raise NotImplementedYet("This feature is not available yet.")
