"""HabitsService: spending limits and challenges. Clock-aware; never reads the real date."""
from __future__ import annotations

from datetime import timedelta

from contracts.dto.habits import (
    ChallengeList,
    ChallengeProgress,
    ChallengeSuggestions,
    CreateLimitRequest,
    LimitProgress,
    LimitReview,
    LimitSuggestion,
    SpendingLimit,
    StartChallengeRequest,
)
from contracts.interfaces.controllers.errors import Conflict, NotFound, ValidationFailed
from contracts.interfaces.repositories.habits import ChallengeRecord
from services.habits.challenges import MAX_SUGGESTIONS, ChallengeCalculator
from services.habits.limits import LimitCalculator, month_key, to_limit_dto


class HabitsServiceImpl:
    def __init__(self, limits, challenges, transactions, clock) -> None:
        self._limits = limits
        self._challenges = challenges
        self._clock = clock
        self._limit_calc = LimitCalculator(transactions)
        self._challenge_calc = ChallengeCalculator(transactions)

    # ------------------------------------------------------------------ limits
    def limit_suggestion(self, customer_id: str) -> LimitSuggestion:
        return self._limit_calc.suggestion(customer_id, self._clock.today())

    def create_limit(self, customer_id: str, request: CreateLimitRequest) -> SpendingLimit:
        month = month_key(self._clock.today())
        if request.month != month:
            raise ValidationFailed(f"A limit can only be set for the current month ({month}).",
                                   [{"field": "month", "issue": "must be the current month"}])
        if self._limits.active_for_month(customer_id, month) is not None:
            raise Conflict("You already have a limit for this month.")
        return to_limit_dto(self._limits.create(customer_id, month, request.amount_cents))

    def current_limit_progress(self, customer_id: str) -> LimitProgress:
        today = self._clock.today()
        record = self._limits.active_for_month(customer_id, month_key(today))
        if record is None:
            raise NotFound("No active limit for this month.")
        return self._limit_calc.progress(record, today)

    def limit_review(self, customer_id: str, limit_id: int) -> LimitReview:
        record = self._limits.get(customer_id, limit_id)
        if record is None:
            raise NotFound("Limit not found.")
        return self._limit_calc.review(record, self._clock.today())

    def limit_id_for_month(self, customer_id: str, month: str | None) -> int | None:
        """Id of the active limit for `month` (default: current month, else the previous one)."""
        today = self._clock.today()
        if month is not None:
            record = self._limits.active_for_month(customer_id, month)
            return record.id if record else None
        for candidate in (month_key(today), _previous_key(month_key(today))):
            record = self._limits.active_for_month(customer_id, candidate)
            if record:
                return record.id
        return None

    # -------------------------------------------------------------- challenges
    def challenge_suggestions(self, customer_id: str) -> ChallengeSuggestions:
        items = self._challenge_calc.templates(customer_id, self._clock.today())[:MAX_SUGGESTIONS]
        return ChallengeSuggestions(items=items)

    def basket_split(self, customer_id: str):
        return self._challenge_calc.basket_split(customer_id, self._clock.today())

    def start_challenge(self, customer_id: str, request: StartChallengeRequest) -> ChallengeProgress:
        today = self._clock.today()
        template = next((t for t in self._challenge_calc.templates(customer_id, today)
                         if t.id == request.template_id), None)
        if template is None:
            template = self._challenge_calc.template_for(customer_id, request.template_id, today)
        if template is None:
            raise NotFound("Challenge template not found.")
        running = [i for i in self.list_challenges(customer_id).items if i.challenge.status.value == "active"]
        if running:  # settles finished challenges first; one challenge at a time keeps the goal clear
            raise Conflict("You already have a challenge running.")
        if self._challenges.active_with_template(customer_id, template.id) is not None:
            raise Conflict("You have already started this challenge.")
        record = self._challenges.create(ChallengeRecord(
            id=0, customer_id=customer_id, template_id=template.id, title=template.title,
            spend_group=template.spend_group.value, rule_kind=template.rule.kind.value,
            rule_amount_cents=template.rule.amount_cents, rule_count=template.rule.count,
            start_date=today, end_date=today + timedelta(days=int(template.duration_days)), status="active",
        ))
        return self._challenge_calc.progress(record, today)[0]

    def list_challenges(self, customer_id: str) -> ChallengeList:
        today = self._clock.today()
        items = []
        for record in self._challenges.list(customer_id):
            progress, status = self._challenge_calc.progress(record, today)
            if status != record.status:
                self._challenges.set_status(customer_id, record.id, status)
            items.append(progress)
        return ChallengeList(items=items)


def _previous_key(month: str) -> str:
    year, mon = int(month[:4]), int(month[5:7])
    return f"{year - 1}-12" if mon == 1 else f"{year}-{mon - 1:02d}"
