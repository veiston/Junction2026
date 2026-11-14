"""UnderstandService: every number of slice 1 (docs/er.md §5.1). The LLM never computes any of these."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Iterable
from datetime import date, timedelta

from contracts.dto.common import Basket, BasketAmount, Category, GroupAmount, Period, Source, SpendGroup
from contracts.dto.transactions import Transaction, TransactionFilter
from contracts.dto.understand import (
    BasketBreakdown, BasketDetail, BasketTrend, BasketTrendMonth, PeerBenchmark, PeerGroup,
    SpenderProfile, SpendingQuery, SpendingSummary,
)
from contracts.interfaces.controllers.errors import NotFound, ValidationFailed
from contracts.interfaces.repositories.shared import (
    Clock, CustomerRepository, MonthlySpendRepository, TransactionRepository,
)
from models.value_objects.period import DATA_START
from models.value_objects.year_month import YearMonth
from services.understand import persona as persona_rules
from services.understand.benchmark import MIN_PEER_GROUP, percentile_rank, quantile
from services.understand.labels import BASKET_ORDER, basket_label, group_label

MAX_TREND_MONTHS = 12
MAX_RANGE_DAYS = 366
TOP_GROUPS = 5
SAMPLE_SIZE = 5
PEER_MONTHS = 3
ALL_REGIONS = "All regions"
# Categories that are not spending: comparing or summing them as "spent" makes no sense.
NON_SPENDING_CATEGORIES = frozenset({"Salary", "Other Income", "Invest Deposit", "Invest Withdraw", "Salary Sweep"})
SOURCE_TEXT = "Calculated from your transactions"


def _prev(ym: YearMonth) -> YearMonth:
    return YearMonth(ym.year - 1, 12) if ym.month == 1 else YearMonth(ym.year, ym.month - 1)


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole > 0 else 0.0


def _change_pct(now: int, before: int) -> float | None:
    return None if before == 0 else round((now - before) / before * 100, 1)


def _spent(tx: Transaction) -> int:
    """Positive = money spent."""
    return -tx.amount_cents


def _is_spending(tx: Transaction) -> bool:
    return tx.flow.value == "spending" and tx.basket is not None


def _val(x) -> str | None:
    """MonthlySpendRow fields are plain strings in SQLite and enums in the fakes."""
    return getattr(x, "value", x)


def _bad(field: str, message: str, issue: str) -> ValidationFailed:
    return ValidationFailed(message, [{"field": field, "issue": issue}])


class UnderstandServiceImpl:
    def __init__(
        self,
        transactions: TransactionRepository,
        monthly_spend: MonthlySpendRepository,
        customers: CustomerRepository,
        clock: Clock,
        open_data=None,
    ) -> None:
        self._tx = transactions
        self._spend = monthly_spend
        self._customers = customers
        self._clock = clock
        self._open_data = open_data

    # ------------------------------------------------------------------ helpers
    def _month(self, month: str | None, today: date) -> YearMonth:
        if month is None:
            return YearMonth.of(today)
        try:
            ym = YearMonth.parse(month)
        except ValueError:
            raise _bad("month", "month must be YYYY-MM.", "bad format") from None
        if ym > YearMonth.of(today):
            raise _bad("month", "month must not be after the month of today.", "in the future")
        if ym < YearMonth.of(DATA_START):
            raise _bad("month", f"month must not be before {YearMonth.of(DATA_START)}.", "before data start")
        return ym

    @staticmethod
    def _top_groups(rows: Iterable[Transaction]) -> list[GroupAmount]:
        amount: dict[str, int] = defaultdict(int)
        count: dict[str, int] = defaultdict(int)
        for t in rows:
            amount[t.spend_group.value] += _spent(t)
            count[t.spend_group.value] += 1
        ranked = sorted(amount, key=lambda g: (-amount[g], g))[:TOP_GROUPS]
        return [
            GroupAmount(spend_group=g, label=group_label(g), amount_cents=amount[g], tx_count=count[g])
            for g in ranked
        ]

    # ------------------------------------------------------------------ US-U1
    def basket_breakdown(self, customer_id: str, month: str | None) -> BasketBreakdown:
        today = self._clock.today()
        ym = self._month(month, today)
        start, end = ym.first_day(), ym.last_day()
        partial = start <= today <= end
        cut = min(end, today)

        prev = _prev(ym)
        p_start, p_last = prev.first_day(), prev.last_day()
        # A month in progress is compared with the same days of the previous month.
        p_end = p_start.replace(day=min(today.day, p_last.day)) if partial else p_last

        rows = self._tx.all_between(customer_id, start, cut)
        prev_rows = self._tx.all_between(customer_id, p_start, p_end)
        spending = [t for t in rows if _is_spending(t)]
        prev_spending = [t for t in prev_rows if _is_spending(t)]
        total = sum(_spent(t) for t in spending)

        baskets: list[BasketDetail] = []
        for b in BASKET_ORDER:
            in_basket = [t for t in spending if t.basket == b]
            amount = sum(_spent(t) for t in in_basket)
            previous = sum(_spent(t) for t in prev_spending if t.basket == b)
            baskets.append(BasketDetail(
                basket=b, amount_cents=amount, share_pct=_pct(amount, total), tx_count=len(in_basket),
                previous_amount_cents=previous, change_pct=_change_pct(amount, previous),
                top_groups=self._top_groups(in_basket),
            ))

        return BasketBreakdown(
            month=str(ym),
            is_partial_month=partial,
            total_spending_cents=total,
            income_cents=sum(t.amount_cents for t in rows if t.flow.value == "income"),
            saving_cents=sum(-t.amount_cents for t in rows if t.flow.value == "saving"),
            baskets=baskets,
            source=Source(description=SOURCE_TEXT, period=Period(from_date=start, to_date=cut),
                          tx_count=len(spending)),
        )

    # ------------------------------------------------------------------ US-U4
    def basket_trend(self, customer_id: str, months: int) -> BasketTrend:
        if isinstance(months, bool) or not isinstance(months, int) or not 1 <= months <= MAX_TREND_MONTHS:
            raise _bad("months", f"months must be 1..{MAX_TREND_MONTHS}.", "out of range")
        today = self._clock.today()
        last = YearMonth.of(today)
        first = last
        for _ in range(months - 1):
            if _prev(first) < YearMonth.of(DATA_START):
                break
            first = _prev(first)

        amount: dict[tuple[str, str], int] = defaultdict(int)
        count: dict[tuple[str, str], int] = defaultdict(int)
        for row in self._spend.for_customer(customer_id, str(first), str(last)):
            if _val(row.flow) != "spending" or row.basket is None:
                continue
            amount[(row.month, _val(row.basket))] += -row.amount_cents
            count[(row.month, _val(row.basket))] += row.tx_count

        out: list[BasketTrendMonth] = []
        ym = first
        while ym <= last:
            m = str(ym)
            total = sum(amount[(m, b.value)] for b in BASKET_ORDER)
            out.append(BasketTrendMonth(month=m, baskets=[
                BasketAmount(basket=b, amount_cents=amount[(m, b.value)],
                             share_pct=_pct(amount[(m, b.value)], total), tx_count=count[(m, b.value)])
                for b in BASKET_ORDER
            ]))
            ym = ym.next()

        return BasketTrend(months=out, source=Source(
            description=SOURCE_TEXT,
            period=Period(from_date=first.first_day(), to_date=min(last.last_day(), today)),
            tx_count=sum(count.values()),
        ))

    # ------------------------------------------------------------------ US-U2
    def spending(
        self,
        customer_id: str,
        from_date: date,
        to_date: date,
        basket: Basket | None = None,
        category: Category | None = None,
        spend_group: SpendGroup | None = None,
    ) -> SpendingSummary:
        chosen = [(k, v) for k, v in (("basket", basket), ("category", category), ("spend_group", spend_group))
                  if v is not None]
        if len(chosen) != 1:
            raise _bad("basket", "Give exactly one of basket, category or spend_group.", "exactly one required")
        kind, value = chosen[0]
        value = {"basket": Basket, "category": Category, "spend_group": SpendGroup}[kind](
            value.value if hasattr(value, "value") else value
        )
        if kind == "category" and value.value in NON_SPENDING_CATEGORIES:
            raise _bad("category", f"{value.value} is not a spending category.", "not spending")

        today = self._clock.today()
        if from_date > to_date:
            raise _bad("from_date", "from_date must be on or before to_date.", "after to_date")
        if from_date < DATA_START:
            raise _bad("from_date", f"from_date must not be before {DATA_START}.", "before data start")
        if from_date > today:
            raise _bad("from_date", "from_date must not be after today.", "in the future")
        if (to_date - from_date).days >= MAX_RANGE_DAYS:
            raise _bad("to_date", f"Date range is limited to {MAX_RANGE_DAYS} days.", "range too long")
        to_date = min(to_date, today)

        def flt(f: date, t: date) -> TransactionFilter:
            return TransactionFilter(from_date=f, to_date=t, flow="spending", **{kind: value})

        now = self._tx.sum(customer_id, flt(from_date, to_date))
        days = (to_date - from_date).days + 1
        p_to = from_date - timedelta(days=1)
        p_from = p_to - timedelta(days=days - 1)
        before = self._tx.sum(customer_id, flt(p_from, p_to))

        match: Callable[[Transaction], bool] = {
            "basket": lambda t: t.basket == value,
            "category": lambda t: t.category == value,
            "spend_group": lambda t: t.spend_group == value,
        }[kind]
        rows = [t for t in self._tx.all_between(customer_id, from_date, to_date) if _is_spending(t) and match(t)]
        samples = sorted(rows, key=lambda t: (t.amount_cents, t.id))[:SAMPLE_SIZE]

        amount = -now.amount_cents
        label = {"basket": basket_label, "category": lambda v: v, "spend_group": group_label}[kind](value.value)
        return SpendingSummary(
            query=SpendingQuery(from_date=from_date, to_date=to_date, **{kind: value}),
            label=label,
            amount_cents=amount,
            tx_count=now.tx_count,
            average_tx_cents=round(amount / now.tx_count) if now.tx_count else 0,
            previous_period_amount_cents=-before.amount_cents,
            sample_transactions=samples,
            source=Source(description=SOURCE_TEXT, period=Period(from_date=from_date, to_date=to_date),
                          tx_count=now.tx_count),
        )

    # ------------------------------------------------------------------ US-U3
    def spender_profile(self, customer_id: str) -> SpenderProfile:
        today = self._clock.today()
        start = max(today - timedelta(days=persona_rules.WINDOW_DAYS - 1), DATA_START)
        # Salary rows a few days before the window still count for "after payday".
        rows = self._tx.all_between(
            customer_id, max(start - timedelta(days=persona_rules.PAYDAY_DAYS_AFTER), DATA_START), today
        )
        salary_days = [t.date for t in rows if t.spend_group.value == "salary"]
        window = [t for t in rows if t.date >= start]
        data_days = (today - min(t.date for t in window)).days + 1 if window else 0
        months = min(data_days, persona_rules.WINDOW_DAYS) / 30

        result = persona_rules.build_persona(window, salary_days, months, data_days)
        return SpenderProfile(
            persona=result.persona, title=result.title, description=result.description,
            traits=result.traits, metrics=result.metrics, tips=result.tips,
            source=Source(description="Calculated from your everyday spending of the last 90 days",
                          period=Period(from_date=start, to_date=today), tx_count=result.everyday_tx_count),
        )

    # ------------------------------------------------------------------ US-U5 / US-U6
    def peer_benchmark(self, customer_id: str, scope: str, key: str) -> PeerBenchmark:
        if scope == "basket":
            if key not in {b.value for b in Basket}:
                raise _bad("key", "key must be a basket.", "unknown basket")
            label = basket_label(key)

            def matches(row) -> bool:
                return _val(row.basket) == key
        elif scope == "category":
            if key not in {c.value for c in Category} or key in NON_SPENDING_CATEGORIES:
                raise _bad("key", "key must be a spending category.", "unknown category")
            label = key

            def matches(row) -> bool:
                return _val(row.category) == key
        else:
            raise _bad("scope", "scope must be basket or category.", "unknown scope")

        me = self._customers.get(customer_id)
        if me is None:
            raise NotFound("Customer not found.")

        today = self._clock.today()
        last = _prev(YearMonth.of(today))
        first = last
        for _ in range(PEER_MONTHS - 1):
            first = _prev(first)

        region = me.region
        group = [c for c in self._customers.ids_in_group(me.age_band, region) if c != customer_id]
        if len(group) < MIN_PEER_GROUP:
            region = ALL_REGIONS
            group = [c for c in self._customers.ids_in_group(me.age_band, None) if c != customer_id]

        in_scope: dict[str, int] = defaultdict(int)
        my_total = 0
        my_count = 0
        for cid, row in self._spend.for_customers([*group, customer_id], str(first), str(last)):
            if _val(row.flow) != "spending" or row.basket is None:
                continue
            if cid == customer_id:
                my_total += -row.amount_cents
            if matches(row):
                in_scope[cid] += -row.amount_cents
                if cid == customer_id:
                    my_count += row.tx_count

        mine = round(in_scope[customer_id] / PEER_MONTHS)
        peers = [round(in_scope[c] / PEER_MONTHS) for c in group]
        open_data = None
        if scope == "category" and self._open_data is not None:
            open_data = self._open_data.household_share(key)

        return PeerBenchmark(
            scope=scope, key=key, label=label,
            your_monthly_cents=mine,
            your_share_of_spending_pct=_pct(in_scope[customer_id], my_total),
            peer_median_monthly_cents=quantile(peers, 0.5),
            peer_p25_monthly_cents=quantile(peers, 0.25),
            peer_p75_monthly_cents=quantile(peers, 0.75),
            your_percentile=percentile_rank(mine, peers),
            peer_group=PeerGroup(age_band=me.age_band, region=region, size=len(group)),
            open_data=open_data,
            source=Source(description="Your last 3 full months compared with similar customers",
                          period=Period(from_date=first.first_day(), to_date=last.last_day()),
                          tx_count=my_count),
        )
