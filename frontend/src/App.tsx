import { Route, Routes } from "react-router-dom";
import { ChatScreen } from "./chat/ChatScreen";
import { WidgetGallery } from "./dev/WidgetGallery";
import { api } from "./api/client";
import { formatCents } from "./widgets/common/Money";

const hostApi = { request: api.request, sendChat: () => {}, formatCents };

export function App() {
  return (
    <Routes>
      {/* Data wiring (useChat) arrives with task frontend-hooks. */}
      <Route path="/" element={<ChatScreen messages={[]} api={hostApi} onSend={() => {}} onChip={() => {}} />} />
      <Route path="/dev/gallery" element={<WidgetGallery />} />
    </Routes>
  );
}
