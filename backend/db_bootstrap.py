"""Fetches the database on first start when the server has an empty disk (for example a new Railway volume).

Set DB_DOWNLOAD_URL to a link to money_coach.sqlite3 or to a gzip of it. If the file is already on disk, nothing happens.
"""
from __future__ import annotations

import gzip
import os
import shutil
import urllib.request
from pathlib import Path

from models.database import DEFAULT_DATABASE_PATH, PROJECT_ROOT


def database_path(env: dict[str, str]) -> Path:
    path = Path(env.get("DB_PATH", str(DEFAULT_DATABASE_PATH)))
    return path if path.is_absolute() else PROJECT_ROOT / path


def ensure_database(env: dict[str, str] | None = None, opener=urllib.request.urlopen) -> bool:
    """Returns True when the file was downloaded now."""
    env = dict(os.environ) if env is None else env
    path = database_path(env)
    url = env.get("DB_DOWNLOAD_URL")
    if (path.exists() and path.stat().st_size > 0) or not url:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_suffix(path.suffix + ".part")
    with opener(url) as response, open(part, "wb") as raw:
        head = response.read(2)
        stream = gzip.GzipFile(fileobj=_Prefixed(head, response)) if head == b"\x1f\x8b" else _Prefixed(head, response)
        shutil.copyfileobj(stream, raw, length=1024 * 1024)
    os.replace(part, path)
    return True


class _Prefixed:
    """A readable that gives back bytes already read, then continues with the response."""

    def __init__(self, head: bytes, rest) -> None:
        self._head, self._rest = head, rest

    def read(self, size: int = -1) -> bytes:
        if self._head:
            if size < 0:
                data, self._head = self._head + self._rest.read(), b""
                return data
            data, self._head = self._head[:size], self._head[size:]
            return data + (self._rest.read(size - len(data)) if len(data) < size else b"")
        return self._rest.read(size)
