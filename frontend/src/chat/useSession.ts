import { useCallback, useEffect, useState } from "react";

import { api } from "@/api/client";
import { setToken } from "@/auth/token";
import type { Me } from "@/contracts";

import { startSession } from "./session";

export type SessionState =
  | { status: "loading"; me: null }
  | { status: "ready"; me: Me }
  | { status: "error"; me: null; message: string };

export function greetingFor(me: Me | null): string {
  return me ? "Hi! Ask me anything about your money, or pick a suggestion below." : "Hi! I'm your money coach.";
}

/** Signs in with a demo session, then loads /me. `retry` starts over. */
export function useSession(): SessionState & { retry: () => void } {
  const [state, setState] = useState<SessionState>({ status: "loading", me: null });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading", me: null });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await startSession();
        const me = await api.getMe();
        if (!cancelled) setState({ status: "ready", me });
      } catch (e) {
        setToken(null);
        if (!cancelled) {
          setState({ status: "error", me: null, message: e instanceof Error ? e.message : "Something went wrong." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { ...state, retry };
}
