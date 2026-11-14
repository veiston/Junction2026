import { useCallback, useRef, useState } from "react";

import { api, ApiError, CHAT_TIMEOUT_MS } from "@/api/client";
import type { AssistantMessage, ChatRequest, ChatResponse, QuickAction } from "@/contracts";

import { withSession } from "./session";

export type ChatMessage = { id: string; role: "user"; text: string } | AssistantMessage;

const FRIENDLY = "Sorry, something went wrong on my side. Please try again.";

export interface UseChat {
  messages: ChatMessage[];
  busy: boolean;
  /** Friendly error text for the last failed turn; null when none. */
  error: string | null;
  send: (text: string) => void;
  sendChip: (action: QuickAction) => void;
  /** Re-sends the last failed turn. */
  retry: () => void;
  /** False on the first view (three function buttons shown); true once a message or function was sent. */
  started: boolean;
  /** Back to the first view: clears the conversation and shows the three function buttons again. */
  reset: () => void;
}

export function useChat(): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const conversationId = useRef<string | null>(null);
  const failed = useRef<ChatRequest | null>(null);
  const inFlight = useRef(false);
  const seq = useRef(0);
  /** Bumped by reset(); an answer that arrives for an older generation is dropped. */
  const generation = useRef(0);

  const post = useCallback(async (req: ChatRequest) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const mine = generation.current;
    setStarted(true);
    setBusy(true);
    setError(null);
    failed.current = null;
    try {
      const res = await withSession(() =>
        api.request<ChatResponse>(
          "POST",
          "/chat",
          { ...req, conversation_id: conversationId.current },
          CHAT_TIMEOUT_MS,
        ),
      );
      if (mine !== generation.current) return;
      conversationId.current = res.conversation_id;
      setMessages((m) => [...m, res.message]);
    } catch (err) {
      if (mine !== generation.current) return;
      if (err instanceof ApiError && err.body.code === "NOT_IMPLEMENTED") {
        // "Coming soon": show the server's text as a normal assistant message.
        setMessages((m) => [
          ...m,
          {
            id: `a-${++seq.current}`,
            role: "assistant",
            created_at: new Date().toISOString(),
            text: err.body.message,
            widgets: [],
            suggestions: [],
            sources: [],
            disclaimer: null,
          },
        ]);
      } else {
        failed.current = req;
        setError(FRIENDLY);
      }
    } finally {
      if (mine === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      setMessages((m) => [...m, { id: `u-${++seq.current}`, role: "user", text: t }]);
      void post({ message: t });
    },
    [post],
  );

  const sendChip = useCallback(
    (action: QuickAction) => {
      void post({ quick_action: action });
    },
    [post],
  );

  const retry = useCallback(() => {
    if (failed.current) void post(failed.current);
  }, [post]);

  const reset = useCallback(() => {
    generation.current += 1;
    inFlight.current = false;
    conversationId.current = null;
    failed.current = null;
    setMessages([]);
    setBusy(false);
    setError(null);
    setStarted(false);
  }, []);

  return { messages, busy, error, send, sendChip, retry, started, reset };
}
