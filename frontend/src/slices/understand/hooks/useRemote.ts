import { useCallback, useEffect, useRef, useState } from "react";

import type { WidgetHostApi } from "@/chat/registry";

export interface Remote<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** GET `path` and replace the data. Older answers that arrive late are ignored. */
  load: (path: string) => void;
}

/** Starts from the data the coach already sent; every later change is fetched through the host API. */
export function useRemote<T>(api: WidgetHostApi, initial: T): Remote<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(
    (path: string) => {
      const call = ++latest.current;
      setLoading(true);
      setError(null);
      api.request<T>("GET", path).then(
        (d) => {
          if (!mounted.current || call !== latest.current) return;
          setData(d);
          setLoading(false);
        },
        () => {
          if (!mounted.current || call !== latest.current) return;
          setError("Could not load this view. Please try again.");
          setLoading(false);
        },
      );
    },
    [api],
  );

  return { data, loading, error, load };
}
