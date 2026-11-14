import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { AssistantMessage, ChatRequest, QuickAction } from "../contracts-temp";
import type { ChatMessage } from "./MessageList";
import { handleUnauthorized } from "./useSession";

interface ChatResponse { conversation_id: string; message: AssistantMessage }

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
}

export function useChat(): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const failed = useRef<ChatRequest | null>(null);
  const inFlight = useRef(false);
  const seq = useRef(0);

  const post = useCallback(async (req: ChatRequest) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    failed.current = null;
    try {
      const res = await api.request<ChatResponse>("POST", "/chat", { ...req, conversation_id: conversationId.current });
      conversationId.current = res.conversation_id;
      setMessages((m) => [...m, res.message]);
    } catch (err) {
      if (err instanceof ApiError && err.body.code === "NOT_IMPLEMENTED") {
        // "Coming soon" chips: show the server's text as a normal assistant message.
        setMessages((m) => [...m, {
          id: `a-${++seq.current}`, role: "assistant", created_at: new Date().toISOString(),
          text: err.body.message, widgets: [], suggestions: [], sources: [], disclaimer: null,
        }]);
      } else {
        handleUnauthorized(err);
        failed.current = req;
        setError(FRIENDLY);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  const send = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { id: `u-${++seq.current}`, role: "user", text: t }]);
    void post({ message: t });
  }, [post]);

  const sendChip = useCallback((action: QuickAction) => { void post({ quick_action: action }); }, [post]);

  const retry = useCallback(() => { if (failed.current) void post(failed.current); }, [post]);

  return { messages, busy, error, send, sendChip, retry };
}
