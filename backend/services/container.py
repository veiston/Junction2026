"""Builds the real services from config (used by api.dependencies)."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from config import Config
from contracts.interfaces.controllers.errors import LlmUnavailable
from models.database import PROJECT_ROOT, Database
from models.repositories.clock import DemoClock
from models.repositories.sqlite_conversation_repo import SqliteConversationRepository
from models.repositories.sqlite_customer_repo import SqliteCustomerRepository
from models.repositories.sqlite_habits_repo import SqliteChallengeRepository, SqliteLimitRepository
from models.repositories.sqlite_transaction_repo import SqliteTransactionRepository
from services.chat.orchestrator import ChatOrchestrator
from services.chat.tool_registry import default_registry
from services.habits.service import HabitsServiceImpl
from services.habits.tools import bind_service as bind_habits_tools
from services.session_service import DATA_TO, SessionServiceImpl
from services.transaction_service import TransactionServiceImpl


class _NoKeyLlm:
    def generate(self, *args, **kwargs):
        raise LlmUnavailable("GEMINI_API_KEY is not set.")


def build_services(config: Config, llm=None) -> SimpleNamespace:
    path = Path(config.db_path)
    db = Database(path if path.is_absolute() else PROJECT_ROOT / path)
    clock = DemoClock(config.demo_today, max_date=DATA_TO)
    transactions = SqliteTransactionRepository(db, clock)
    tx_service = TransactionServiceImpl(transactions, clock)
    habits = HabitsServiceImpl(SqliteLimitRepository(db), SqliteChallengeRepository(db), transactions, clock)
    bind_habits_tools(habits)
    if llm is None:
        if config.gemini_api_key:
            from google import genai

            from adapters.llm.gemini_client import GeminiClient

            llm = GeminiClient(genai.Client(api_key=config.gemini_api_key), config.gemini_model)
        else:
            llm = _NoKeyLlm()
    chat = ChatOrchestrator(llm, default_registry(tx_service), SqliteConversationRepository(db), clock)
    session = SessionServiceImpl(SqliteCustomerRepository(db), clock, config.jwt_secret)
    return SimpleNamespace(session=session, chat=chat, transactions=tx_service, habits=habits, clock=clock)
