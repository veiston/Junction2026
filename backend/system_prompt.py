from pathlib import Path

SYSTEM_PROMPT_PATH = Path(__file__).parent / "system_prompt.txt"

# Load the system prompt from an external file (It got so long)
SYSTEM_PROMPT = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
