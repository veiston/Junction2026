"""The three spending baskets (docs/er.md section 3)."""

from enum import Enum


class Basket(str, Enum):
    MANDATORY_REGULAR = "mandatory_regular"
    MANDATORY_IRREGULAR = "mandatory_irregular"
    EVERYDAY = "everyday"
