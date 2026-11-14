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
from models.repositories.sqlite_monthly_spend_repo import SqliteMonthlySpendRepository
from models.repositories.sqlite_transaction_repo import SqliteTransactionRepository
from services.chat.orchestrator import ChatOrchestrator
from services.chat.tool_registry import default_registry
from services.plan.plan_service import PlanServiceImpl
from services.session_service import DATA_TO, SessionServiceImpl
from services.transaction_service import TransactionServiceImpl


class _NoKeyLlm:
    def generate(self, *args, **kwargs):
        raise LlmUnavailable("GEMINI_API_KEY is not set.")


def _with_local_model(cloud, config: Config):
    # Money figures stay on the local model; Gemini only sees non-sensitive turns.
    from adapters.llm.ollama_client import OllamaClient
    from adapters.llm.routing_llm import PrivacyRoutingLlm

    local = OllamaClient.from_config(config.ollama_base_url, config.ollama_api_key, config.ollama_model)
    return PrivacyRoutingLlm(cloud, local)


def build_services(config: Config, llm=None) -> SimpleNamespace:
    path = Path(config.db_path)
    db = Database(path if path.is_absolute() else PROJECT_ROOT / path)
    clock = DemoClock(config.demo_today, max_date=DATA_TO)
    transactions = SqliteTransactionRepository(db, clock)
    tx_service = TransactionServiceImpl(transactions, clock)
    plan = PlanServiceImpl(transactions, SqliteMonthlySpendRepository(db, clock), clock)
    if llm is None:
        if config.gemini_api_key:
            from google import genai

            from adapters.llm.gemini_client import GeminiClient

            llm = GeminiClient(genai.Client(api_key=config.gemini_api_key), config.gemini_model)
        else:
            llm = _NoKeyLlm()
        if config.ollama_base_url:
            llm = _with_local_model(llm, config)
    chat = ChatOrchestrator(llm, default_registry(tx_service, plan), SqliteConversationRepository(db), clock)
    session = SessionServiceImpl(SqliteCustomerRepository(db), clock, config.jwt_secret)
    return SimpleNamespace(session=session, chat=chat, transactions=tx_service, plan=plan, clock=clock)
