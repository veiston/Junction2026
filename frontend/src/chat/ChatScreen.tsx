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
}

/** Pure presentational: all data comes from props (hooks arrive in task frontend-hooks). */
export function ChatScreen({ messages, api, onSend, onChip, busy }: Props) {
  return (
    <main className="chat">
      <MessageList messages={messages} api={api} onSend={onSend} />
      {messages.length === 0 && <QuickActions onChip={onChip} disabled={busy} />}
      <Composer onSend={onSend} disabled={busy} />
    </main>
  );
}
