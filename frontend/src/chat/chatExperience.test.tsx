import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { setToken } from "@/auth/token";
import { basketBreakdownMock } from "@/slices/understand/mocks";

import { ChatScreen } from "./ChatScreen";
import { STEP_MS } from "./TypingBubble";
import { monthName, typingSteps } from "./typingSteps";
import { useChat } from "./useChat";

const fetchMock = jest.fn();
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
const reply = (text: string, widgets: unknown[] = []) =>
  json(200, {
    conversation_id: "c1",
    message: {
      id: "m1", role: "assistant", created_at: "2026-09-15T10:00:00Z", text, widgets,
      suggestions: [], sources: [], disclaimer: null,
    },
  });

function Harness() {
  return <ChatScreen chat={useChat()} today="2026-09-15" />;
}

beforeEach(() => {
  fetchMock.mockReset();
  setToken("tok");
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe("typing steps", () => {
  it("names the month of the demo clock for the understand summary", () => {
    expect(monthName("2026-09-15")).toBe("September 2026");
    expect(typingSteps({ quick_action: "understand_my_money" }, "2026-09-15")).toContain(
      "Building your September 2026 summary…",
    );
    expect(typingSteps({ message: "hi" })).toHaveLength(3);
    expect(typingSteps(null)).toEqual([]);
  });
});

describe("chat experience", () => {
  it("Understand my money: prompt bubble first, then typing steps, then a short answer with the card", async () => {
    jest.useFakeTimers();
    let answer!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (answer = r)));
    render(<Harness />);

    fireEvent.press(screen.getByText("Understand My Money"));
    expect(screen.getByTestId("bubble-user")).toBeTruthy();
    expect(screen.getByText("Show me my spending analysis and monthly trends")).toBeTruthy();
    expect(screen.getByTestId("typing-step").props.children).toBe("Reading your transactions…");

    act(() => jest.advanceTimersByTime(STEP_MS));
    expect(screen.getByTestId("typing-step").props.children).toBe("Building your September 2026 summary…");

    const card = { id: "w1", version: 1, type: "basket_breakdown", data: basketBreakdownMock };
    await act(async () => answer(reply("Everyday spending **doubled** this month.", [card])));
    expect(screen.queryByTestId("typing-step")).toBeNull();
    expect(screen.getByText("doubled")).toBeTruthy();
    expect(screen.queryByText(/\*\*/)).toBeNull();
    expect(screen.getByText("Your three baskets · Sep 2026 so far")).toBeTruthy();
    jest.useRealTimers();
  });

  it("typed messages appear as the customer's bubble and the coach answers in a bubble", async () => {
    fetchMock.mockResolvedValue(reply("Hello!"));
    render(<Harness />);
    fireEvent.changeText(screen.getByPlaceholderText(/Ask anything/), "hi coach");
    fireEvent(screen.getByPlaceholderText(/Ask anything/), "submitEditing");
    expect(await screen.findByTestId("bubble-coach")).toBeTruthy();
    expect(screen.getByText("hi coach")).toBeTruthy();
  });
});
