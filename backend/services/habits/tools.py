"""Chat tools of the habits slice. The slice fills TOOLS; foundation only imports it."""
from __future__ import annotations

from contracts.interfaces.llm.ai_tool import AiTool

TOOLS: list[AiTool] = []


def bind_service(service) -> None:
    """Connects the tools to the habits service (called once by the container)."""
