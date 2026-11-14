"""Builds the real services from config (used by api.dependencies)."""

from __future__ import annotations

import os
from pathlib import Path
from types import SimpleNamespace

from config import Config
from contracts.interfaces.controllers.errors import LlmUnavailable
from models.database import PROJECT_ROOT, Database
from models.repositories.clock import DemoClock
from models.repositories.sqlite_conversation_repo import SqliteConversationRepository
from models.repositories.sqlite_customer_repo import SqliteCustomerRepository
from models.repositories.sqlite_habits_repo import SqliteChallengeRepository, SqliteLimitRepository
from models.repositories.sqlite_monthly_spend_repo import SqliteMonthlySpendRepository
from models.repositories.sqlite_transaction_repo import SqliteTransactionRepository
from services.chat.orchestrator import ChatOrchestrator
from services.chat.tool_registry import default_registry
from services.habits.service import HabitsServiceImpl
from services.habits.tools import bind_service as bind_habits_tools
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


def llm_for_chat(cloud, config: Config, env: dict[str, str] | None = None):
    """The model every chat uses unless the customer picks "Local" in the app (then the request carries its own model).

    Gemini by default, so "Gemini" in the switcher really is Gemini. Set LOCAL_BY_DEFAULT=1 to route answers that
    contain money figures to the local model for every chat, as in the first version.
    """
    env = dict(os.environ) if env is None else env
    local_by_default = env.get("LOCAL_BY_DEFAULT", "").strip().lower() in ("1", "true", "yes")
    if config.ollama_base_url and local_by_default:
        return _with_local_model(cloud, config)
    return cloud


def build_services(config: Config, llm=None) -> SimpleNamespace:
    path = Path(config.db_path)
    db = Database(path if path.is_absolute() else PROJECT_ROOT / path)
    clock = DemoClock(config.demo_today, max_date=DATA_TO)
    transactions = SqliteTransactionRepository(db, clock)
    tx_service = TransactionServiceImpl(transactions, clock)
    plan = PlanServiceImpl(transactions, SqliteMonthlySpendRepository(db, clock), clock)
    habits = HabitsServiceImpl(SqliteLimitRepository(db), SqliteChallengeRepository(db), transactions, clock)
    bind_habits_tools(habits)
    if llm is None:
        if config.gemini_api_key:
            from google import genai

            from adapters.llm.gemini_client import GeminiClient

            llm = GeminiClient(genai.Client(api_key=config.gemini_api_key), config.gemini_model)
        else:
            llm = _NoKeyLlm()
        llm = llm_for_chat(llm, config)
    chat = ChatOrchestrator(llm, default_registry(tx_service, plan), SqliteConversationRepository(db), clock)
    session = SessionServiceImpl(SqliteCustomerRepository(db), clock, config.jwt_secret)
    return SimpleNamespace(
        session=session, chat=chat, transactions=tx_service, plan=plan, habits=habits, clock=clock
    )
