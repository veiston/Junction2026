import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

export interface Me {
  customer_id: string; age: number; age_band: string; postal_code: string; region: string;
  today: string; data_from: string; currency: "EUR";
}

/** Tell the embedding host app (embedded-demo) to issue a fresh token. */
export function notifyTokenExpired(): void {
  window.parent.postMessage({ type: "token-expired" }, "*");
}

/** Returns true (and notifies the host) when the error is a 401. */
export function handleUnauthorized(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 401) {
    notifyTokenExpired();
    return true;
  }
  return false;
}

export type SessionState =
  | { status: "loading"; me: null; greeting: string }
  | { status: "ready"; me: Me; greeting: string }
  | { status: "expired" | "error"; me: null; greeting: string };

export function greetingFor(me: Me | null): string {
  return me
    ? "Hi! Ask me anything about your money, or pick a suggestion below."
    : "Hi! I'm your money coach.";
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading", me: null, greeting: greetingFor(null) });

  useEffect(() => {
    let cancelled = false;
    api.request<Me>("GET", "/me").then(
      (me) => { if (!cancelled) setState({ status: "ready", me, greeting: greetingFor(me) }); },
      (err) => {
        if (cancelled) return;
        const expired = handleUnauthorized(err);
        setState({ status: expired ? "expired" : "error", me: null, greeting: greetingFor(null) });
      },
    );
    return () => { cancelled = true; };
  }, []);

  return state;
}
