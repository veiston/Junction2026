import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import gemini_ai
import local_ai
from conversation import ChatMessage

HOST = "0.0.0.0"  # reachable from device on the same network
PORT = 8000
ALLOWED_ORIGINS = ["*"]
GEMINI_ROUTE = "/chat"
LOCAL_ROUTE = "/chat/local"

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"]
)

# Call the gemini api
@app.post(GEMINI_ROUTE)
def chat(messages: list[ChatMessage]) -> str:
    return gemini_ai.chat(messages)


# Call the local ollama model
@app.post(LOCAL_ROUTE)
def chat_local(messages: list[ChatMessage]) -> str:
    return local_ai.chat(messages)


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
