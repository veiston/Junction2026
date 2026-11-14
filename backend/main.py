import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import gemini_ai
import local_ai
from conversation import Message

HOST = "0.0.0.0"  # reachable from device on the same network
PORT = 8000
ALLOWED_ORIGINS = ["*"]

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"]
)

# Call the gemini api
@app.post("/chat")
def chat(messages: list[Message]) -> str:
    return gemini_ai.chat(messages)


# Call the local ollama model
@app.post("/chat/local")
def chat_local(messages: list[Message]) -> str:
    return local_ai.chat(messages)


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
