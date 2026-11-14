import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

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
    expect(await screen.findByText("Help me plan my finances")).toBeTruthy();
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
});
