import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

MODEL = os.environ["GEMINI_DEFAULT_MODEL"]

gemini = genai.Client()  # reads GOOGLE_API_KEY or GEMINI_API_KEY


class Message(BaseModel):
    role: Literal["user", "model"]
    text: str


def chat(messages: list[Message]) -> str:
    contents = [{"role": message.role, "parts": [{"text": message.text}]} for message in messages]
    response = gemini.models.generate_content(model=MODEL, contents=contents).text
    return response
