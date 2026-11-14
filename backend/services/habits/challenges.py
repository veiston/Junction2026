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
from services.habits.limits import (
    everyday_rows,
    group_totals,
    month_end,
    month_key,
    previous_month_start,
    source_for,
    spent,
)
from services.session_service import DATA_FROM

MAX_SUGGESTIONS = 3
ZERO_SPEND_MIN_ROWS = 4
ZERO_SPEND_DAYS = 14
MAX_AMOUNT_DAYS = 30


class ChallengeCalculator:
    def __init__(self, transactions) -> None:
        self._tx = transactions

    # -------------------------------------------------------------- templates
    def templates(self, customer_id: str, today: date) -> list[ChallengeTemplate]:
        start = previous_month_start(today.replace(day=1))
        if start < DATA_FROM:
            return []
        end = month_end(month_key(start))
        rows = everyday_rows(self._tx.all_between(customer_id, start, end))
        days_in_month = (end - start).days + 1
        out: list[ChallengeTemplate] = []
        for g in group_totals(rows)[:MAX_SUGGESTIONS]:
            group = g.spend_group.value
            name = g.label
            last = f"{g.amount_cents / 100:.0f} EUR in {g.tx_count} purchases"
            if g.tx_count >= ZERO_SPEND_MIN_ROWS:
                kind, days = "zero_spend", ZERO_SPEND_DAYS
                rule = ChallengeRule(kind=kind)
                saving = g.amount_cents * days // days_in_month
                title = f"{days} days without {name.lower()}"
                description = f"Skip {name.lower()} for {days} days."
            else:
                kind, days = "max_amount", MAX_AMOUNT_DAYS
                cap = g.amount_cents // 2
                rule = ChallengeRule(kind=kind, amount_cents=cap)
                saving = g.amount_cents - cap
                title = f"Halve {name.lower()} for {days} days"
                description = f"Keep {name.lower()} under {cap / 100:.0f} EUR over {days} days."
            out.append(ChallengeTemplate(
                id=f"{kind}_{group}_{days}d", title=title, description=description, spend_group=g.spend_group,
                rule=rule, duration_days=days, estimated_saving_cents=saving,
                reason=f"Last month you spent {last} on {name.lower()}.",
            ))
        return out

    # --------------------------------------------------------------- progress
    def progress(self, record: ChallengeRecord, today: date) -> tuple[ChallengeProgress, str]:
        """Returns the progress and the status it should have today (the caller stores changes)."""
        duration = max(1, (record.end_date - record.start_date).days)
        last_day = min(today, record.end_date - timedelta(days=1))
        rows = []
        if last_day >= record.start_date:
            rows = [t for t in self._tx.all_between(record.customer_id, record.start_date, last_day)
                    if t.flow.value == "spending" and t.spend_group.value == record.spend_group]
        amount, count = spent(rows), len(rows)
        if record.rule_kind == "zero_spend":
            ok = count == 0
        elif record.rule_kind == "max_amount":
            ok = amount <= (record.rule_amount_cents or 0)
        else:
            ok = count <= (record.rule_count or 0)
        status = record.status
        if status == "active" and today >= record.end_date:
            status = "won" if ok else "lost"
        elapsed = min(duration, max(0, (today - record.start_date).days))
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
        )
        return progress, status
