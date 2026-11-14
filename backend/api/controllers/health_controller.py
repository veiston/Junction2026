from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

_VERSION_FILE = Path(__file__).resolve().parents[3] / "contracts" / "VERSION"


def _version() -> str:
    try:
        return _VERSION_FILE.read_text().strip()
    except OSError:
        return "1.0.0"


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "contracts_version": _version()}
