import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { setToken } from "@/auth/token";
import { transactionListMock } from "@/dev/mocks";

import { ChatScreen } from "./ChatScreen";
import { useChat } from "./useChat";

const fetchMock = jest.fn();

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
const err = (status: number, code: string, message = "boom") =>
  json(status, { error: { code, message, details: [], request_id: "r" } });

const widget = { id: "w1", version: 1, type: "transaction_list", data: transactionListMock };
const reply = (text: string, widgets: unknown[] = []) =>
  json(200, {
    conversation_id: "c1",
    message: {
      id: "m1",
      role: "assistant",
      created_at: "2026-09-15T10:00:00Z",
      text,
      widgets,
      suggestions: [],
      sources: [],
      disclaimer: null,
    },
  });

const bodyOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body);

function Harness() {
  const chat = useChat();
  return <ChatScreen chat={chat} />;
}

beforeEach(() => {
  fetchMock.mockReset();
  setToken("tok");
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe("chat", () => {
  it("first view shows the heading, the three function cards and the example chips", () => {
    render(<Harness />);
    expect(screen.getByText("What would you like to do today?")).toBeTruthy();
    expect(screen.getByText("Understand My Money")).toBeTruthy();
    expect(screen.getByText("Plan My Finances")).toBeTruthy();
    expect(screen.getByText("Improve My Habits")).toBeTruthy();
    expect(screen.getByText("Coffee spend")).toBeTruthy();
  });

  it("an example chip sends its question as a message", async () => {
    fetchMock.mockResolvedValue(reply("About coffee"));
    render(<Harness />);
    fireEvent.press(screen.getByText("Coffee spend"));
    expect(await screen.findByText("About coffee")).toBeTruthy();
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({ message: "How much do I spend on coffee?" });
  });

  it("sends a message and renders assistant text with a transaction_list widget", async () => {
    fetchMock.mockResolvedValue(reply("Here you go", [widget]));
    render(<Harness />);
    fireEvent.changeText(screen.getByLabelText("Message"), "show my latest transactions");
    fireEvent.press(screen.getByLabelText("Send"));

    expect(await screen.findByText("Here you go")).toBeTruthy();
    expect(screen.getByText("show my latest transactions")).toBeTruthy();
    expect(screen.getByText("Latest transactions")).toBeTruthy();
    expect(screen.getByText("Supermarkets")).toBeTruthy();
    expect(screen.getByText("See all (23)")).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/v1/chat");
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({ message: "show my latest transactions" });
  });

  it("a chip sends its quick action and a 501 'coming soon' shows as a normal message", async () => {
    fetchMock.mockResolvedValue(err(501, "NOT_IMPLEMENTED", "Coming soon"));
    render(<Harness />);
    fireEvent.press(screen.getByText("Plan My Finances"));
    expect(await screen.findByText("Coming soon")).toBeTruthy();
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({ quick_action: "plan_my_finances" });
  });

  it("picking a function shows it as the customer's own message", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<Harness />);
    fireEvent.press(screen.getByText("Plan My Finances"));
    expect(await screen.findByText("Help me save for what I want")).toBeTruthy();
  });

  it("scrolls to a new reply even when the list resizes before the reply reports its position", async () => {
    fetchMock.mockResolvedValue(reply("About coffee"));
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
    render(<Harness />);
    fireEvent.press(screen.getByText("Coffee spend"));
    const bubble = await screen.findByTestId("bubble-coach");
    // The container reports its new size first (react-native-web orders observers this way) ...
    fireEvent(screen.UNSAFE_getByType(ScrollView), "contentSizeChange", 300, 900);
    expect(scrollTo).not.toHaveBeenCalled();
    // ... and only then does the reply report where it starts.
    let node = bubble.parent;
    while (node && !node.props.onLayout) node = node.parent;
    fireEvent(node as NonNullable<typeof node>, "layout", { nativeEvent: { layout: { x: 0, y: 120, width: 300, height: 80 } } });
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: expect.any(Number), animated: true }));
    scrollTo.mockRestore();
  });

  it("a failed turn shows a friendly message and Retry resends it", async () => {
    fetchMock.mockResolvedValueOnce(err(502, "LLM_UNAVAILABLE")).mockResolvedValueOnce(reply("Recovered"));
    render(<Harness />);
    fireEvent.changeText(screen.getByLabelText("Message"), "hi");
    fireEvent.press(screen.getByLabelText("Send"));
    expect(await screen.findByText(/something went wrong/i)).toBeTruthy();

    fireEvent.press(screen.getByText("Retry"));
    expect(await screen.findByText("Recovered")).toBeTruthy();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });

  it("a 401 creates a new demo session once and retries the call", async () => {
    fetchMock
      .mockResolvedValueOnce(err(401, "TOKEN_EXPIRED"))
      .mockResolvedValueOnce(json(201, { token: "fresh", expires_at: "x" }))
      .mockResolvedValueOnce(reply("After refresh"));
    render(<Harness />);
    fireEvent.changeText(screen.getByLabelText("Message"), "hi");
    fireEvent.press(screen.getByLabelText("Send"));

    expect(await screen.findByText("After refresh")).toBeTruthy();
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:8000/api/v1/demo/session");
    expect((fetchMock.mock.calls[2][1] as { headers: Record<string, string> }).headers.Authorization).toBe("Bearer fresh");
  });

  it("a second 401 shows the error instead of looping", async () => {
    fetchMock
      .mockResolvedValueOnce(err(401, "TOKEN_EXPIRED"))
      .mockResolvedValueOnce(json(201, { token: "fresh", expires_at: "x" }))
      .mockResolvedValueOnce(err(401, "TOKEN_EXPIRED"));
    render(<Harness />);
    fireEvent.changeText(screen.getByLabelText("Message"), "hi");
    fireEvent.press(screen.getByLabelText("Send"));
    expect(await screen.findByText(/something went wrong/i)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("See all", () => {
  const page = (n: number) =>
    json(200, {
      items: [{ ...transactionListMock.page.items[0], id: 100 + n, label: `Row page ${n}` }],
      page: n,
      page_size: 5,
      total: 11,
      total_amount_cents: -312450,
    });

  it("opens a paged list that uses the widget filter and keeps the totals", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/chat")) return reply("Here", [widget]);
      return page(Number(new URL(url).searchParams.get("page")));
    });
    render(<Harness />);
    fireEvent.changeText(screen.getByLabelText("Message"), "latest");
    fireEvent.press(screen.getByLabelText("Send"));
    fireEvent.press(await screen.findByLabelText("See all 23 transactions"));

    expect(await screen.findByText("Row page 1")).toBeTruthy();
    expect(screen.getByTestId("see-all-totals").props.children.join("")).toContain("11 transactions");
    const first = new URL(fetchMock.mock.calls[1][0] as string);
    expect(first.pathname).toBe("/api/v1/transactions");
    expect(first.searchParams.get("from_date")).toBe("2026-09-01");
    expect(first.searchParams.get("to_date")).toBe("2026-09-15");

    fireEvent.press(screen.getByLabelText("Next page"));
    expect(await screen.findByText("Row page 2")).toBeTruthy();
    fireEvent.press(screen.getByText("Back to chat"));
    await waitFor(() => expect(screen.getByText("Here")).toBeTruthy());
  });
});

describe("first view and the three functions", () => {
  it("hides the cards, chips and heading after a message is sent", async () => {
    fetchMock.mockResolvedValue(reply("Hi back"));
    render(<Harness />);
    fireEvent.changeText(screen.getByLabelText("Message"), "hello");
    fireEvent.press(screen.getByLabelText("Send"));
    expect(await screen.findByText("Hi back")).toBeTruthy();
    expect(screen.queryByText("Understand My Money")).toBeNull();
    expect(screen.queryByText("What would you like to do today?")).toBeNull();
  });

  it("hides the chips as soon as a function is picked, even before the answer", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<Harness />);
    fireEvent.press(screen.getByText("Improve My Habits"));
    await waitFor(() => expect(screen.queryByText("Plan My Finances")).toBeNull());
  });

  it("reset brings the first view back with the three chips and an empty conversation", async () => {
    fetchMock.mockResolvedValue(reply("Answer one"));
    let chatRef: ReturnType<typeof useChat> | null = null;
    function WithRef() {
      const chat = useChat();
      chatRef = chat;
      return <ChatScreen chat={chat} />;
    }
    render(<WithRef />);
    fireEvent.changeText(screen.getByLabelText("Message"), "hello");
    fireEvent.press(screen.getByLabelText("Send"));
    expect(await screen.findByText("Answer one")).toBeTruthy();

    act(() => chatRef!.reset());
    expect(screen.getByText("Understand My Money")).toBeTruthy();
    expect(screen.getByText("What would you like to do today?")).toBeTruthy();
    expect(screen.queryByText("Answer one")).toBeNull();
  });

  it("an answer that arrives after reset is dropped", async () => {
    let finish: (v: unknown) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((r) => (finish = r)));
    let chatRef: ReturnType<typeof useChat> | null = null;
    function WithRef() {
      const chat = useChat();
      chatRef = chat;
      return <ChatScreen chat={chat} />;
    }
    render(<WithRef />);
    fireEvent.changeText(screen.getByLabelText("Message"), "hello");
    fireEvent.press(screen.getByLabelText("Send"));
    act(() => chatRef!.reset());
    await act(async () => finish(reply("Too late")));
    expect(screen.queryByText("Too late")).toBeNull();
    expect(screen.getByText("Understand My Money")).toBeTruthy();
  });

  it("a card question shows only the question and sends the card's numbers to the assistant", async () => {
    fetchMock.mockResolvedValueOnce(reply("Because it is a realistic first step."));
    render(<Harness />);
    await act(async () => {
      const { postChatAsk } = require("./chatAsk");
      postChatAsk("Why this goal?", "Goal 49,00 EUR, last week 99,26 EUR.");
    });
    await waitFor(() => expect(screen.getByText("Because it is a realistic first step.")).toBeTruthy());
    expect(screen.getByText("Why this goal?")).toBeTruthy();
    expect(screen.queryByText(/Card facts/)).toBeNull();
    expect(bodyOf(fetchMock.mock.calls[0]).message).toBe("Why this goal?\n\nCard facts: Goal 49,00 EUR, last week 99,26 EUR.");
  });

  it("a pill that repeats a section's request starts that section", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        conversation_id: "c1",
        message: {
          id: "m1", role: "assistant", created_at: "2026-09-15T10:00:00Z", text: "I can help.", widgets: [],
          suggestions: ["Show me where my money goes", "Help me save for what I want", "Help me spend less on everyday things"],
          sources: [], disclaimer: null,
        },
      }),
    );
    fetchMock.mockResolvedValueOnce(reply("ok"));
    render(<Harness />);
    fireEvent.changeText(screen.getByPlaceholderText("Ask anything about your money..."), "what can you do");
    fireEvent.press(screen.getByLabelText("Send"));
    await waitFor(() => expect(screen.getByText("Help me spend less on everyday things")).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText("Help me spend less on everyday things"));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(bodyOf(fetchMock.mock.calls[1])).toEqual({ quick_action: "improve_my_habits", conversation_id: "c1" });
  });

  it("a card question can bring its own pill when the assistant adds none", async () => {
    fetchMock.mockResolvedValueOnce(reply("Nothing is lost."));
    render(<Harness />);
    await act(async () => {
      const { postChatAsk } = require("./chatAsk");
      postChatAsk("I skipped the challenge. What now?", "skipped", ["Show me another challenge to try"]);
    });
    await waitFor(() => expect(screen.getByText("Nothing is lost.")).toBeTruthy());
    expect(screen.getByText("Show me another challenge to try")).toBeTruthy();
  });
});
