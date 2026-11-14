"""ElevenLabs and Voice integration service (TTS & STT)."""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import urllib.error
import urllib.request
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory audio cache to minimize ElevenLabs API calls and latency
_AUDIO_CACHE: dict[str, bytes] = {}


class VoiceService:
    def __init__(self, api_key: str, default_voice_id: str = "EXAVITQu4vr4xnSDxMaL"):
        self.api_key = api_key.strip() if api_key else ""
        self.default_voice_id = default_voice_id

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def text_to_speech(self, text: str, voice_id: Optional[str] = None) -> bytes:
        if not self.is_configured:
            raise ValueError("ELEVENLABS_API_KEY is not configured in .env")

        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text cannot be empty")

        vid = voice_id or self.default_voice_id
        cache_key = hashlib.sha256(f"{vid}:{clean_text}".encode("utf-8")).hexdigest()
        if cache_key in _AUDIO_CACHE:
            return _AUDIO_CACHE[cache_key]

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
        payload = json.dumps({
            "text": clean_text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "xi-api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                audio_data = resp.read()
                _AUDIO_CACHE[cache_key] = audio_data
                return audio_data
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="replace")
            logger.error("ElevenLabs API HTTP error %d: %s", e.code, err_msg)
            raise RuntimeError(f"ElevenLabs TTS error ({e.code}): {err_msg}") from e
        except Exception as e:
            logger.error("ElevenLabs TTS request failed: %s", e)
            raise RuntimeError(f"ElevenLabs TTS request failed: {e}") from e

    def speech_to_text(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
        """Transcribe audio bytes using ElevenLabs STT, falling back to Gemini."""
        if not audio_bytes:
            raise ValueError("Audio bytes cannot be empty")

        # 1. Try ElevenLabs Scribe STT if configured
        if self.is_configured:
            try:
                boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
                filename = "audio.webm" if "webm" in mime_type else "audio.m4a" if "m4a" in mime_type else "audio.wav"

                body = bytearray()
                # model_id field
                body.extend(f"--{boundary}\r\n".encode("utf-8"))
                body.extend(b'Content-Disposition: form-data; name="model_id"\r\n\r\n')
                body.extend(b"scribe_v1\r\n")

                # file field
                body.extend(f"--{boundary}\r\n".encode("utf-8"))
                body.extend(
                    f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8")
                )
                body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
                body.extend(audio_bytes)
                body.extend(b"\r\n")
                body.extend(f"--{boundary}--\r\n".encode("utf-8"))

                req = urllib.request.Request(
                    "https://api.elevenlabs.io/v1/speech-to-text",
                    data=bytes(body),
                    headers={
                        "xi-api-key": self.api_key,
                        "Content-Type": f"multipart/form-data; boundary={boundary}",
                        "Accept": "application/json",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    text = data.get("text", "").strip()
                    if text:
                        return text
            except Exception as e:
                logger.warning("ElevenLabs STT attempt failed (%s), falling back to Gemini", e)

        # 2. Fallback to Gemini multimodal audio transcription
        try:
            from google import genai

            client = genai.Client()
            model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            response = client.models.generate_content(
                model=model,
                contents=[
                    {"inline_data": {"mime_type": mime_type, "data": audio_bytes}},
                    "Transcribe the spoken audio verbatim in the language spoken. Return only the transcription, no punctuation commentary or notes.",
                ],
            )
            return (response.text or "").strip()
        except Exception as e:
            logger.error("Gemini audio transcription failed: %s", e)
            raise RuntimeError(f"Speech transcription failed: {e}") from e
