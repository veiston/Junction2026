import type { AssistantMessage } from "../contracts-temp";
import { SourceLine } from "../widgets/common/SourceLine";
import { WidgetHost } from "./WidgetHost";
import type { WidgetHostApi } from "./registry";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | AssistantMessage;

interface Props {
  messages: ChatMessage[];
  api: WidgetHostApi;
  /** Tapping a follow-up suggestion sends it as a message. */
  onSend: (text: string) => void;
}

export function MessageList({ messages, api, onSend }: Props) {
  return (
    <ol className="chat__list" aria-label="Conversation" aria-live="polite">
      {messages.map((m) =>
        m.role === "user" ? (
          <li key={m.id} className="msg msg--user">{m.text}</li>
        ) : (
          <li key={m.id} className="msg msg--assistant">
            <div className="msg__text">{m.text}</div>
            {m.widgets.map((w) => (
              <WidgetHost key={w.id} widget={w} api={api} />
            ))}
            {m.sources.map((s, i) => (
              <SourceLine key={i} source={s} />
            ))}
            {m.disclaimer && <p className="msg__disclaimer">{m.disclaimer}</p>}
            {m.suggestions.length > 0 && (
              <div className="chips" role="group" aria-label="Follow-up suggestions">
                {m.suggestions.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => onSend(s)}>{s}</button>
                ))}
              </div>
            )}
          </li>
        ),
      )}
    </ol>
  );
}
