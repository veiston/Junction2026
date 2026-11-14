from io import BytesIO

import ollama  # Please install ollama from their website (https://ollama.com/) beforehand. After that download the model with: ollama pull gemma4:e4b
import pypdfium2 as pdfium

from conversation import SYSTEM_PROMPT, Message

# Use the gemma4:e4b model
MODEL = "gemma4:e4b"
CONTEXT_LENGTH = 16384  # Ollama's default is too small for a few PDF pages
PDF_MIME_TYPE = "application/pdf"
PAGE_SCALE = 2  # 144 dpi, enough to read receipt print
ROLES = {"user": "user", "model": "assistant"}


# Inputs: messages(list[Message])
def chat(messages: list[Message]) -> str:
    contents = [{"role": "system", "content": SYSTEM_PROMPT}, *[to_ollama(message) for message in messages]]
    # Call LLM API with specified model and prompt.
    response = ollama.chat(model=MODEL, messages=contents, think=False, options={"num_ctx": CONTEXT_LENGTH})
    return response.message.content


def to_ollama(message: Message) -> dict:
    texts = [message.text]
    images = []
    for file in message.attachments:
        if file.mime_type == PDF_MIME_TYPE:
            pdf_texts, pdf_images = read_pdf(file.data)
            texts += pdf_texts
            images += pdf_images
        else:
            images.append(file.data)
    return {"role": ROLES[message.role], "content": "\n\n".join(texts), "images": images}


# Ollama reads no PDFs: text pages go in as text, scanned pages as images
def read_pdf(data: bytes) -> tuple[list[str], list[bytes]]:
    texts = []
    images = []
    for page in pdfium.PdfDocument(data):
        text = page.get_textpage().get_text_range().strip()
        if text:
            texts.append(text)
        else:
            images.append(render(page))
    return texts, images


def render(page: pdfium.PdfPage) -> bytes:
    buffer = BytesIO()
    page.render(scale=PAGE_SCALE).to_pil().save(buffer, format="PNG")
    return buffer.getvalue()


# Module test (Won't be ran when imported)
if __name__ == "__main__":
    from fastapi.testclient import TestClient

    from main import app

    question = [{"role": "user", "text": "I spend 300€ a month at Alko Oy. Would that be a good fit for my budget?"}]
    print(TestClient(app).post("/chat/local", json=question).json())
