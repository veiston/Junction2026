"""Environment configuration with demo-friendly defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date


def _bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Config:
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    jwt_secret: str = "dev-secret-change-me"
    demo_mode: bool = True
    demo_today: date = date(2026, 9, 15)
    db_path: str = "db/money_coach.sqlite3"
    coach_origin: str = "http://localhost:5173"
    demo_origin: str = "http://localhost:8081"
    ollama_base_url: str = ""  # empty = no local model, Gemini answers everything
    ollama_api_key: str = ""
    ollama_model: str = "gemma4:e4b"
    # LiteRT-LM runs the model inside the backend. Relative paths start at the project root.
    litert_model_path: str = "models/litert/gemma-4-E2B-it.litertlm"
    litert_backend: str = "cpu"  # cpu | gpu
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "JBFqnCBsd6RMkjVDRZzb"

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Config:
        e = os.environ if env is None else env
        d = cls()
        return cls(
            gemini_api_key=e.get("GEMINI_API_KEY", d.gemini_api_key),
            gemini_model=e.get("GEMINI_MODEL", d.gemini_model),
            jwt_secret=e.get("JWT_SECRET", d.jwt_secret),
            demo_mode=_bool(e["DEMO_MODE"]) if "DEMO_MODE" in e else d.demo_mode,
            demo_today=date.fromisoformat(e["DEMO_TODAY"]) if "DEMO_TODAY" in e else d.demo_today,
            db_path=e.get("DB_PATH", d.db_path),
            coach_origin=e.get("COACH_ORIGIN", d.coach_origin),
            demo_origin=e.get("DEMO_ORIGIN", d.demo_origin),
            ollama_base_url=e.get("OLLAMA_BASE_URL", d.ollama_base_url),
            ollama_api_key=e.get("OLLAMA_API_KEY", d.ollama_api_key),
            ollama_model=e.get("OLLAMA_MODEL", d.ollama_model),
            litert_model_path=e.get("LITERT_MODEL_PATH", d.litert_model_path),
            litert_backend=e.get("LITERT_BACKEND", d.litert_backend).strip().lower(),
            elevenlabs_api_key=e.get("ELEVENLABS_API_KEY", d.elevenlabs_api_key),
            elevenlabs_voice_id=e.get("ELEVENLABS_VOICE_ID", d.elevenlabs_voice_id),
        )
