import ollama  # Please install ollama from their website (https://ollama.com/) beforehand. After that download the model with: ollama pull gemma4:e4b

from conversation import ChatMessage
from services import pdf_service
from system_prompt import SYSTEM_PROMPT

# Use the gemma4:e4b model
MODEL = "gemma4:e4b"
CONTEXT_LENGTH = 16384  # Ollama's default is too small for a few PDF pages
SYSTEM_ROLE = "system"
ROLES = {"user": "user", "model": "assistant"}
TEXT_SEPARATOR = "\n\n"


# Inputs: messages(list[ChatMessage])
def chat(messages: list[ChatMessage]) -> str:
    contents = [{"role": SYSTEM_ROLE, "content": SYSTEM_PROMPT}]
    contents += [to_ollama(message) for message in messages]
    # Call LLM API with specified model and prompt.
    response = ollama.chat(model=MODEL, messages=contents, think=False, options={"num_ctx": CONTEXT_LENGTH})
    return response.message.content


# Ollama reads no PDFs, so they go in as text and page images
def to_ollama(message: ChatMessage) -> dict:
    texts = [message.text]
    images = []
    for file in message.attachments:
        if file.mime_type == pdf_service.MIME_TYPE:
            pdf_texts, pdf_images = pdf_service.read(file.data)
            texts += pdf_texts
            images += pdf_images
        else:
            images.append(file.data)
    return {"role": ROLES[message.role], "content": TEXT_SEPARATOR.join(texts), "images": images}


# Module test (Won't be ran when imported)
if __name__ == "__main__":
    print(chat([ChatMessage(role="user", text="I spend 300€ a month at Alko Oy. Would that be a good fit for my budget?")]))
