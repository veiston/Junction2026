import { useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { ChatScreen } from "./chat/ChatScreen";
import { SeeAllPanel } from "./chat/SeeAllPanel";
import { useChat } from "./chat/useChat";
import { useSession } from "./chat/useSession";
import { WidgetGallery } from "./dev/WidgetGallery";
import { api } from "./api/client";
import { formatCents } from "./widgets/common/Money";
import type { ChatRequest, TransactionListData } from "./contracts-temp";

const SEE_ALL_PREFIX = "Show all: ";

function Coach() {
  const session = useSession();
  const chat = useChat();
  const [seeAll, setSeeAll] = useState<{ title: string; filter: TransactionListData["filter"] } | null>(null);

  const hostApi = useMemo(() => ({
    request: api.request,
    formatCents,
    // The transaction_list widget's default "See all" asks for "Show all: <title>";
    // open the paged list for that widget instead of sending a chat turn.
    sendChat: (req: ChatRequest) => {
      const msg = req.message ?? "";
      if (msg.startsWith(SEE_ALL_PREFIX)) {
        const title = msg.slice(SEE_ALL_PREFIX.length);
        for (const m of chat.messages) {
          if (m.role !== "assistant") continue;
          const w = m.widgets.find((x) => x.type === "transaction_list" && (x.data as unknown as TransactionListData).title === title);
          if (w) {
            setSeeAll({ title, filter: (w.data as unknown as TransactionListData).filter });
            return;
          }
        }
      }
      if (req.quick_action) chat.sendChip(req.quick_action);
      else if (req.message) chat.send(req.message);
    },
  }), [chat.messages, chat.send, chat.sendChip]);

  if (seeAll) return <SeeAllPanel title={seeAll.title} filter={seeAll.filter} onClose={() => setSeeAll(null)} />;
  return (
    <ChatScreen
      messages={chat.messages}
      api={hostApi}
      onSend={chat.send}
      onChip={chat.sendChip}
      busy={chat.busy || session.status === "expired"}
      greeting={session.greeting}
      error={session.status === "expired" ? "Your session expired. Reconnecting…" : chat.error}
      onRetry={chat.retry}
    />
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Coach />} />
      <Route path="/dev/gallery" element={<WidgetGallery />} />
    </Routes>
  );
}
