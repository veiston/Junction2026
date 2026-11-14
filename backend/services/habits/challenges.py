"""Challenge logic: personalised templates and progress computed from transactions."""
from __future__ import annotations

from datetime import date, timedelta

from contracts.dto.habits import (
    Challenge,
    ChallengeProgress,
    ChallengeRule,
    ChallengeTemplate,
)
from contracts.interfaces.repositories.habits import ChallengeRecord
from services.chat.glossary import euros, render_concept
from services.habits.limits import (
    everyday_rows,
    group_totals,
    source_for,
    spent,
)
from services.session_service import DATA_FROM

MAX_SUGGESTIONS = 3
EXPERIMENT_DAYS = 7
LOOKBACK_DAYS = 28
MIN_PURCHASES = 3
TARGET_SHARE_NUM, TARGET_SHARE_DEN = 1, 2
WEEKS_PER_YEAR = 52
NEXT_STEP = "You can repeat the experiment for 7 days, or try another category."


def _target_cents(baseline_cents: int) -> int:
    """Half of the baseline, rounded down to whole euros."""
    return baseline_cents * TARGET_SHARE_NUM // TARGET_SHARE_DEN // 100 * 100


class ChallengeCalculator:
    def __init__(self, transactions) -> None:
        self._tx = transactions

    def _group_spend(self, customer_id: str, group: str, first: date, last: date) -> tuple[int, int]:
        """(cents, purchases) in one spend group, everyday spending only."""
        rows = [t for t in everyday_rows(self._tx.all_between(customer_id, first, last))
                if t.spend_group.value == group]
        return spent(rows), len(rows)

    # -------------------------------------------------------------- templates
    def templates(self, customer_id: str, today: date) -> list[ChallengeTemplate]:
        """One-week experiments on regular everyday habits found in the last 28 full days."""
        first = max(DATA_FROM, today - timedelta(days=LOOKBACK_DAYS))
        last = today - timedelta(days=1)
        if first > last:
            return []
        rows = everyday_rows(self._tx.all_between(customer_id, first, last))
        baseline_first = today - timedelta(days=EXPERIMENT_DAYS)
        out: list[ChallengeTemplate] = []
        for g in group_totals(rows):
            if g.tx_count < MIN_PURCHASES:
                continue
            group = g.spend_group.value
            baseline, count = self._group_spend(customer_id, group, baseline_first, last)
            if count < 1 or baseline <= 0:
                continue
            target = _target_cents(baseline)
            saving = baseline - target
            name = g.label.lower()
            if target == 0:
                title = f"A week without {name}"
                description = f"Skip {name} for {EXPERIMENT_DAYS} days."
            else:
                title = f"Keep {name} under {euros(target)} for {EXPERIMENT_DAYS} days"
                description = f"Spend at most {euros(target)} on {name} over the next {EXPERIMENT_DAYS} days."
            noun = "purchase" if count == 1 else "purchases"
            out.append(ChallengeTemplate(
                id=f"max_amount_{group}_{EXPERIMENT_DAYS}d", title=title, description=description,
                spend_group=g.spend_group, rule=ChallengeRule(kind="max_amount", amount_cents=target),
                duration_days=EXPERIMENT_DAYS, estimated_saving_cents=saving,
                reason=f"{count} {noun} on {name}, {euros(baseline)} in the last {EXPERIMENT_DAYS} days.",
                baseline_cents=baseline, baseline_count=count, yearly_saving_cents=saving * WEEKS_PER_YEAR,
                concept=render_concept("compare_equal_periods"),
            ))
            if len(out) == MAX_SUGGESTIONS:
                break
        return out

    # --------------------------------------------------------------- progress
    def progress(self, record: ChallengeRecord, today: date) -> tuple[ChallengeProgress, str]:
        """Returns the progress and the status it should have today (the caller stores changes)."""
        duration = max(1, (record.end_date - record.start_date).days)
        last_day = min(today, record.end_date - timedelta(days=1))
        amount, count = 0, 0
        if last_day >= record.start_date:
            amount, count = self._group_spend(record.customer_id, record.spend_group, record.start_date, last_day)
        baseline, baseline_count = self._group_spend(
            record.customer_id, record.spend_group,
            record.start_date - timedelta(days=duration), record.start_date - timedelta(days=1))
        target = (record.rule_amount_cents or 0) if record.rule_kind == "max_amount" else 0
        if record.rule_kind == "zero_spend":
            ok = count == 0
        elif record.rule_kind == "max_amount":
            ok = amount <= target
        else:
            ok = count <= (record.rule_count or 0)
        status = record.status
        if status == "active" and today >= record.end_date:
            status = "won" if ok else "lost"
        elapsed = min(duration, max(0, (today - record.start_date).days))
        projected = amount * duration // elapsed if elapsed >= 1 else None
        if status == "active" and record.rule_kind == "max_amount" and projected is not None and projected > target:
            ok = False
        concept = None
        if status in ("won", "lost"):
            concept = render_concept("one_week_is_not_proof")
        elif status == "active":
            concept = render_concept("spending_pace", **({"projected": projected, "target": target}
                                                         if projected is not None else {}))
        challenge = Challenge(
            id=record.id, template_id=record.template_id, title=record.title, spend_group=record.spend_group,
            rule=ChallengeRule(kind=record.rule_kind, amount_cents=record.rule_amount_cents, count=record.rule_count),
            start_date=record.start_date, end_date=record.end_date, status=status,
        )
        progress = ChallengeProgress(
            challenge=challenge, progress_pct=round(elapsed / duration * 100, 1), current_amount_cents=amount,
            current_count=count, days_left=max(0, (record.end_date - today).days),
            on_track=(status == "won") if status in ("won", "lost") else ok,
            source=source_for(record.start_date, max(record.start_date, last_day), count),
            baseline_cents=baseline, baseline_count=baseline_count, difference_cents=baseline - amount,
            change_pct=round((baseline - amount) / baseline * 100, 1) if baseline > 0 else None,
            concept=concept, next_step=NEXT_STEP if status in ("won", "lost") else None,
        )
        return progress, status
