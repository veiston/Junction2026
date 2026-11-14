import type { QuickAction } from "../contracts-temp";
import { Composer } from "./Composer";
import { MessageList, type ChatMessage } from "./MessageList";
import { QuickActions } from "./QuickActions";
import type { WidgetHostApi } from "./registry";

interface Props {
  messages: ChatMessage[];
  api: WidgetHostApi;
  onSend: (text: string) => void;
  onChip: (action: QuickAction) => void;
  busy?: boolean;
  greeting?: string;
  /** Friendly error for the last failed turn, with a retry button. */
  error?: string | null;
  onRetry?: () => void;
}

/** Pure presentational: all data comes from props (wired to hooks in App.tsx). */
export function ChatScreen({ messages, api, onSend, onChip, busy, greeting, error, onRetry }: Props) {
  return (
    <main className="chat">
      {messages.length === 0 && greeting && <p className="chat__greeting">{greeting}</p>}
      <MessageList messages={messages} api={api} onSend={onSend} />
      {busy && <p role="status">Thinking…</p>}
      {error && (
        <p role="alert" className="chat__error">
          {error} {onRetry && <button type="button" className="link-btn" onClick={onRetry}>Retry</button>}
        </p>
      )}
      {messages.length === 0 && <QuickActions onChip={onChip} disabled={busy} />}
      <Composer onSend={onSend} disabled={busy} />
    </main>
  );
}
