"""Voice controller for ElevenLabs Text-to-Speech and Speech-to-Text features."""
from __future__ import annotations

import base64
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from api.dependencies import get_config
from config import Config
from services.voice_service import VoiceService

router = APIRouter(tags=["voice"])


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: Optional[str] = None


class SttRequest(BaseModel):
    audio_base64: str = Field(..., min_length=1)
    mime_type: str = "audio/webm"


@router.get("/voice/status")
def get_voice_status(config: Config = Depends(get_config)) -> dict[str, bool]:
    configured = bool(config.elevenlabs_api_key and config.elevenlabs_api_key.strip())
    return {"configured": configured}


@router.post("/voice/tts")
def post_voice_tts(request: TtsRequest, config: Config = Depends(get_config)) -> Response:
    if not config.elevenlabs_api_key:
        raise HTTPException(
            status_code=503,
            detail="ELEVENLABS_API_KEY is not configured in .env",
        )
    service = VoiceService(config.elevenlabs_api_key, config.elevenlabs_voice_id)
    try:
        audio_bytes = service.text_to_speech(request.text, request.voice_id)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/voice/stt")
def post_voice_stt(request: SttRequest, config: Config = Depends(get_config)) -> dict[str, str]:
    service = VoiceService(config.elevenlabs_api_key, config.elevenlabs_voice_id)
    try:
        raw_b64 = request.audio_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        audio_bytes = base64.b64decode(raw_b64)
        text = service.speech_to_text(audio_bytes, request.mime_type)
        return {"text": text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
