from __future__ import annotations

import gzip
import io

from db_bootstrap import ensure_database


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def run(tmp_path, payload: bytes, existing: bytes | None = None, url: str | None = "http://x/db"):
    target = tmp_path / "data" / "money_coach.sqlite3"
    if existing is not None:
        target.parent.mkdir(parents=True)
        target.write_bytes(existing)
    env = {"DB_PATH": str(target), **({"DB_DOWNLOAD_URL": url} if url else {})}
    calls = []

    def opener(u):
        calls.append(u)
        return FakeResponse(payload)

    return ensure_database(env, opener), target, calls


def test_downloads_a_plain_file_when_the_disk_is_empty(tmp_path):
    done, target, calls = run(tmp_path, b"SQLite format 3\x00" + b"x" * 5000)
    assert done and calls == ["http://x/db"] and target.read_bytes().startswith(b"SQLite format 3")
    assert not target.with_suffix(".sqlite3.part").exists()


def test_unpacks_a_gzip(tmp_path):
    body = b"SQLite format 3\x00" + b"y" * 5000
    done, target, _ = run(tmp_path, gzip.compress(body))
    assert done and target.read_bytes() == body


def test_does_nothing_when_the_file_is_already_there(tmp_path):
    done, target, calls = run(tmp_path, b"new", existing=b"old data")
    assert not done and calls == [] and target.read_bytes() == b"old data"


def test_does_nothing_without_a_link(tmp_path):
    done, target, calls = run(tmp_path, b"new", url=None)
    assert not done and calls == [] and not target.exists()
