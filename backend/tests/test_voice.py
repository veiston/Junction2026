import base64
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from api.server import create_app
from config import Config
from services.voice_service import VoiceService


def test_voice_service_no_key():
    service = VoiceService("")
    assert not service.is_configured
    try:
        service.text_to_speech("Hello")
        assert False, "Should raise ValueError"
    except ValueError as e:
        assert "ELEVENLABS_API_KEY is not configured" in str(e)


def test_voice_service_empty_text():
    service = VoiceService("dummy-key")
    assert service.is_configured
    try:
        service.text_to_speech("   ")
        assert False, "Should raise ValueError"
    except ValueError as e:
        assert "Text cannot be empty" in str(e)


def test_voice_service_success():
    service = VoiceService("dummy-key")
    fake_audio = b"\xff\xfb\x90\x00fake-audio-bytes"

    mock_resp = MagicMock()
    mock_resp.read.return_value = fake_audio
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        res = service.text_to_speech("Hello world")
        assert res == fake_audio


def test_voice_controller_status():
    cfg = Config(elevenlabs_api_key="sk-test-key")
    app = create_app(cfg)
    client = TestClient(app)

    res = client.get("/api/v1/voice/status")
    assert res.status_code == 200
    assert res.json() == {"configured": True}


def test_voice_controller_tts():
    cfg = Config(elevenlabs_api_key="sk-test-key")
    app = create_app(cfg)
    client = TestClient(app)

    fake_audio = b"\xff\xfb\x90\x00fake-audio-bytes"
    mock_resp = MagicMock()
    mock_resp.read.return_value = fake_audio
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        res = client.post("/api/v1/voice/tts", json={"text": "Test speech"})
        assert res.status_code == 200
        assert res.headers["content-type"] == "audio/mpeg"
        assert res.content == fake_audio


def test_voice_controller_stt():
    cfg = Config(elevenlabs_api_key="sk-test-key")
    app = create_app(cfg)
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({"text": "Show my spending"}).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        b64 = base64.b64encode(b"dummy-audio-bytes").decode("ascii")
        res = client.post("/api/v1/voice/stt", json={"audio_base64": b64, "mime_type": "audio/webm"})
        assert res.status_code == 200
        assert res.json() == {"text": "Show my spending"}
