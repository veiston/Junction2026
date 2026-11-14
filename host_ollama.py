#!/usr/bin/env python3
"""Cross-platform script to host Ollama and expose it via an ngrok tunnel.

Reads configuration from .env and .env.local.
"""
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def load_env(env_path: Path) -> dict[str, str]:
    """Parse a simple .env file without external dependencies."""
    env: dict[str, str] = {}
    if not env_path.is_file():
        return env
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip("'\"")
        env[key] = val
    return env


def main() -> int:
    root_dir = Path(__file__).resolve().parent

    # 1. Load .env and .env.local
    file_env = load_env(root_dir / ".env")
    file_env.update(load_env(root_dir / ".env.local"))

    def get_conf(key: str, default: str) -> str:
        return os.environ.get(key) or file_env.get(key) or default

    host = get_conf("OLLAMA_HOST", "127.0.0.1")
    port = get_conf("OLLAMA_PORT", "11434")
    basic_auth = get_conf("NGROK_BASIC_AUTH", "admin:otter1xx")
    ctx_len = get_conf("OLLAMA_CONTEXT_LENGTH", "32768")
    kv_cache = get_conf("OLLAMA_KV_CACHE_TYPE", "q8_0")
    flash_attn = get_conf("OLLAMA_FLASH_ATTENTION", "1")
    keep_alive = get_conf("OLLAMA_KEEP_ALIVE", "-1")

    # 2. Check prerequisites
    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        print("Error: 'ollama' executable not found on PATH.", file=sys.stderr)
        return 1

    ngrok_bin = shutil.which("ngrok")
    if not ngrok_bin:
        print("Error: 'ngrok' executable not found on PATH.", file=sys.stderr)
        return 1

    # 3. Stop any existing running instances
    if sys.platform != "win32":
        subprocess.run(["pkill", "-f", "ollama serve"], stderr=subprocess.DEVNULL)
    else:
        subprocess.run(["taskkill", "/F", "/IM", "ollama.exe"], stderr=subprocess.DEVNULL)

    # 4. Prepare environment for Ollama
    ollama_env = os.environ.copy()
    ollama_env.update({
        "OLLAMA_HOST": f"0.0.0.0:{port}",
        "OLLAMA_CONTEXT_LENGTH": ctx_len,
        "OLLAMA_KV_CACHE_TYPE": kv_cache,
        "OLLAMA_FLASH_ATTENTION": flash_attn,
        "OLLAMA_KEEP_ALIVE": keep_alive,
    })

    print(f"Starting Ollama on {host}:{port}...")
    ollama_proc = subprocess.Popen(
        [ollama_bin, "serve"],
        env=ollama_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    def cleanup(*_):
        print("\nStopping Ollama and ngrok...")
        try:
            ollama_proc.terminate()
            ollama_proc.wait(timeout=3)
        except Exception:
            ollama_proc.kill()

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # 5. Wait for Ollama to be ready
    health_url = f"http://127.0.0.1:{port}/api/tags"
    ready = False
    for _ in range(30):
        try:
            with urllib.request.urlopen(health_url, timeout=1) as resp:
                if resp.status == 200:
                    ready = True
                    break
        except Exception:
            time.sleep(0.5)

    if not ready:
        print("Warning: Ollama took longer than expected to start, launching ngrok anyway.")
    else:
        print("Ollama is ready!")

    # 6. Launch ngrok
    ngrok_cmd = [
        ngrok_bin,
        "http",
        f"{host}:{port}",
        f"--host-header={host}:{port}",
    ]
    if basic_auth:
        ngrok_cmd.append(f"--basic-auth={basic_auth}")

    print(f"Launching ngrok forwarding to {host}:{port} with basic auth...")
    try:
        ngrok_proc = subprocess.Popen(ngrok_cmd)
        ngrok_proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()

    return 0


if __name__ == "__main__":
    sys.exit(main())
