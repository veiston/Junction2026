from pathlib import Path

import uvicorn
from dotenv import load_dotenv

# Read the project's .env (works the same on macOS, Linux and Windows). Real environment
# variables win over the file.
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

from api.server import create_app  # noqa: E402  (must come after load_dotenv)

app = create_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
