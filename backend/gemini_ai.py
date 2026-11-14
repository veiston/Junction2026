import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from conversation import SYSTEM_PROMPT, Message

load_dotenv(Path(__file__).parent.parent / ".env")

MODEL = os.environ["GEMINI_DEFAULT_MODEL"]


def chat(messages: list[Message]) -> str:
    gemini = genai.Client()  # reads GOOGLE_API_KEY or GEMINI_API_KEY
    contents = [to_gemini(message) for message in messages]
    config = {"system_instruction": SYSTEM_PROMPT}
    response = gemini.models.generate_content(model=MODEL, contents=contents, config=config).text
    return response


# Gemini reads images and PDFs natively
def to_gemini(message: Message) -> dict:
    files = [{"inline_data": {"mime_type": file.mime_type, "data": file.data}} for file in message.attachments]
    return {"role": message.role, "parts": [{"text": message.text}, *files]}


# Module test (Won't be accessed when imported)
if __name__ == "__main__":
    from fastapi.testclient import TestClient
    from main import app

    question = [{"role": "user", "text": "Would a raw banana be a good fit for my diet?"}]
    print(TestClient(app).post("/chat", json=question).json())
