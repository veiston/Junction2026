import { useCallback, useRef, useState } from "react";

const FAILURE_MESSAGE = "Could not update. Please try again.";

export interface Refetch<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** Runs the request and replaces the data with its answer. */
  refetch: (send: () => Promise<T>) => void;
}

/** Holds a widget's data and swaps in the answer of the latest request; older answers are ignored. */
export function useRefetch<T>(initial: T): Refetch<T> {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const refetch = useCallback((send: () => Promise<T>) => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    const isStale = () => request !== latestRequest.current;

    setLoading(true);
    setError(null);
    send().then(
      (next) => {
        if (isStale()) {
          return;
        }
        setData(next);
        setLoading(false);
      },
      () => {
        if (isStale()) {
          return;
        }
        setError(FAILURE_MESSAGE);
        setLoading(false);
      },
    );
  }, []);

  return { data, loading, error, refetch };
}
