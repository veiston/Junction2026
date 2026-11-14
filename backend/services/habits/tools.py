"""AI tools of the habits slice. The slice fills TOOLS; foundation only imports it."""
from __future__ import annotations

from contracts.interfaces.llm.ai_tool import AiTool

TOOLS: list[AiTool] = []
