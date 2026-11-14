import { useCallback, useEffect, useState } from "react";

import type { WidgetHostApi } from "@/chat/registry";
import type { BasketBreakdown, BasketTrend, SpendingSummary, TransactionPage } from "@/contracts";

import { addMonths } from "../format";
import { useRemote } from "./useRemote";

/** First month with data in the dataset (docs/er.md). */
export const FIRST_MONTH = "2024-10";
export const TREND_RANGES = [2, 4, 6] as const;
export const SEE_ALL_PAGE_SIZE = 20;

/** Month switch for basket_breakdown: GET /understand/baskets?month=YYYY-MM. */
export function useBasketBreakdown(api: WidgetHostApi, initial: BasketBreakdown) {
  const remote = useRemote(api, initial);
  // The month of "today" is the partial one; when the coach sent a full month we let the server decide.
  const lastMonth = initial.is_partial_month ? initial.month : null;
  const month = remote.data.month;
  const canPrev = month > FIRST_MONTH;
  const canNext = lastMonth ? month < lastMonth : !remote.data.is_partial_month;
  const go = useCallback(
    (step: number) => remote.load(`/understand/baskets?month=${addMonths(month, step)}`),
    [remote, month],
  );
  return { ...remote, canPrev, canNext, prev: () => go(-1), next: () => go(1) };
}

/** Range selector for basket_trend: GET /understand/trend?months=3|6|12. */
export function useBasketTrend(api: WidgetHostApi, initial: BasketTrend) {
  const remote = useRemote(api, initial);
  const [months, setMonthsState] = useState<number>(initial.months.length);
  const setMonths = useCallback(
    (n: number) => {
      setMonthsState(n);
      remote.load(`/understand/trend?months=${n}`);
    },
    [remote],
  );
  return { ...remote, months, setMonths };
}

/** The GET /transactions filter that lists exactly the rows behind a spending summary. */
export function spendingFilterQuery(summary: SpendingSummary, page: number, pageSize = SEE_ALL_PAGE_SIZE): string {
  const q = summary.query;
  const p = new URLSearchParams({ from_date: q.from_date, to_date: q.to_date, flow: "spending" });
  if (q.basket) p.set("basket", q.basket);
  if (q.category) p.set("category", q.category);
  if (q.spend_group) p.set("spend_group", q.spend_group);
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  return p.toString();
}

/** "See all" for spending_summary: pages through GET /transactions with the summary's filter. */
export function useSpendingTransactions(api: WidgetHostApi, summary: SpendingSummary) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TransactionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = spendingFilterQuery(summary, page);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.request<TransactionPage>("GET", `/transactions?${query}`).then(
      (d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError("Could not load the transactions.");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, open, query]);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  return {
    open,
    toggle: () => setOpen((o) => !o),
    data,
    loading,
    error,
    page,
    pageCount,
    setPage: (n: number) => setPage(Math.min(Math.max(1, n), pageCount)),
  };
}
