import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "@/api/client";
import type { TransactionFilter, TransactionPage } from "@/contracts";

import { withSession } from "./session";

export const PAGE_SIZE = 20;

export function toQuery(filter: TransactionFilter, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v !== undefined && v !== null) p.set(k, String(v));
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  return p.toString();
}

export interface UseTransactions {
  data: TransactionPage | null;
  page: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
}

/** "See all": pages through GET /transactions using the same filter as the widget. */
export function useTransactions(filter: TransactionFilter, pageSize = PAGE_SIZE): UseTransactions {
  const [page, setPageState] = useState(1);
  const [data, setData] = useState<TransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    withSession(() =>
      api.request<TransactionPage>("GET", `/transactions?${toQuery(JSON.parse(filterKey), page, pageSize)}`),
    ).then(
      (d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      },
      (err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.status === 401 ? "Your session expired." : "Could not load transactions.");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [filterKey, page, pageSize]);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const setPage = useCallback((n: number) => setPageState(Math.max(1, n)), []);
  return { data, page, pageCount, loading, error, setPage };
}
