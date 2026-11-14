"""Download the LiteRT-LM model used by the LiteRT switch (once, about 2.6 GB).

    uv run --directory backend python ../scripts/get_litert_model.py [--model e2b|e4b]

Files come from Google's public litert-community repos on Hugging Face (Apache-2.0, no login).
The download goes to a .part file first, so a broken download never looks like a model.
"""
from __future__ import annotations

import argparse
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = ROOT / "models" / "litert"
MODELS = {
    # name: (Hugging Face repo, file)
    "e2b": ("litert-community/gemma-4-E2B-it-litert-lm", "gemma-4-E2B-it.litertlm"),  # ~2.6 GB, default
    "e4b": ("litert-community/gemma-4-E4B-it-litert-lm", "gemma-4-E4B-it.litertlm"),  # ~3.7 GB, smarter, slower
}
CHUNK = 8 * 1024 * 1024


def url_for(repo: str, filename: str) -> str:
    return f"https://huggingface.co/{repo}/resolve/main/{filename}"


def download(url: str, target: Path) -> None:
    part = target.with_suffix(target.suffix + ".part")
    with urllib.request.urlopen(url) as response, open(part, "wb") as out:
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        while chunk := response.read(CHUNK):
            out.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done / 1e9:.2f} / {total / 1e9:.2f} GB", end="", flush=True)
    print()
    shutil.move(part, target)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", choices=sorted(MODELS), default="e2b")
    args = parser.parse_args()

    repo, filename = MODELS[args.model]
    target = TARGET_DIR / filename
    if target.is_file():
        print(f"OK   {target} is already there.")
    else:
        TARGET_DIR.mkdir(parents=True, exist_ok=True)
        print(f"GET  {filename} from {repo}")
        download(url_for(repo, filename), target)
        print(f"OK   saved to {target}")
    if args.model != "e2b":
        print(f"Set LITERT_MODEL_PATH=models/litert/{filename} in .env to use it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
