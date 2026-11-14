import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatScreen } from "./ChatScreen";
import { WidgetHost } from "./WidgetHost";
import { transactionListMock } from "../dev/mocks";
import { formatCents } from "../widgets/common/Money";
import type { AssistantMessage } from "../contracts-temp";

const api = { request: vi.fn(), sendChat: vi.fn(), formatCents };

const assistant: AssistantMessage = {
  id: "m1", role: "assistant", created_at: "2026-09-15T10:00:00Z", text: "Here you go",
  widgets: [{ id: "w1", type: "transaction_list", version: 1, data: transactionListMock as never }],
  suggestions: ["More?"], sources: [], disclaimer: null,
};

describe("chat", () => {
  it("shows 3 chips when empty and fires onChip", () => {
    const onChip = vi.fn();
    render(<ChatScreen messages={[]} api={api} onSend={vi.fn()} onChip={onChip} />);
    expect(screen.getAllByRole("button", { name: /my money|my finances|my habits/i })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Plan my finances" }));
    expect(onChip).toHaveBeenCalledWith("plan_my_finances");
  });

  it("sends typed messages", () => {
    const onSend = vi.fn();
    render(<ChatScreen messages={[]} api={api} onSend={onSend} onChip={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: " hi " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("hi");
  });

  it("renders assistant text and the transaction widget", () => {
    render(<ChatScreen messages={[assistant]} api={api} onSend={vi.fn()} onChip={vi.fn()} />);
    expect(screen.getByText("Here you go")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Latest transactions" })).toBeInTheDocument();
  });

  it("unknown widget type renders a fallback, not a crash", () => {
    render(<WidgetHost widget={{ id: "x", type: "what_if", version: 1, data: {} }} api={api} />);
    expect(screen.getByTestId("widget-fallback")).toHaveTextContent("coming soon");
  });
});
