import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from conversation import ChatMessage
from system_prompt import SYSTEM_PROMPT

load_dotenv(Path(__file__).parent.parent / ".env")

DEFAULT_MODEL = "gemini-3.8-flash"
MODEL = os.getenv("GEMINI_DEFAULT_MODEL", DEFAULT_MODEL)


def chat(messages: list[ChatMessage]) -> str:
    gemini = genai.Client()  # reads GEMINI_API_KEY
    contents = [to_gemini(message) for message in messages]
    config = {"system_instruction": SYSTEM_PROMPT}
    response = gemini.models.generate_content(model=MODEL, contents=contents, config=config).text
    return response


# Gemini reads images and PDFs natively
def to_gemini(message: ChatMessage) -> dict:
    files = [{"inline_data": {"mime_type": file.mime_type, "data": file.data}} for file in message.attachments]
    return {"role": message.role, "parts": [{"text": message.text}, *files]}


# Module test (Won't be accessed when imported)
if __name__ == "__main__":
    print(chat([ChatMessage(role="user", text="I spend 300€ a month at Alko Oy. Would that be a good fit for my budget?")]))
