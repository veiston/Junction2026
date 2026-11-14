"""Direction of money (docs/er.md section 3). Only SPENDING rows have a basket."""

from enum import Enum


class Flow(str, Enum):
    INCOME = "income"
    SPENDING = "spending"
    SAVING = "saving"
    TRANSFER = "transfer"
