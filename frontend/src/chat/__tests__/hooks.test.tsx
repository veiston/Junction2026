import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App";
import { transactionListMock } from "../../dev/mocks";
import { useSession } from "../useSession";
import { useTransactions } from "../useTransactions";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const err = (status: number, code: string, message = "msg") => json(status, { error: { code, message, details: [], request_id: "r" } });

const me = { customer_id: "c1", age: 30, age_band: "25-34", postal_code: "00100", region: "Helsinki region", today: "2026-09-15", data_from: "2024-10-01", currency: "EUR" };
const reply = (text: string, widgets: unknown[] = []) =>
  json(200, { conversation_id: "conv1", message: { id: "m1", role: "assistant", created_at: "2026-09-15T10:00:00Z", text, widgets, suggestions: [], sources: [], disclaimer: null } });
const txWidget = { id: "w1", type: "transaction_list", version: 1, data: transactionListMock };

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
function mockFetch(h: Handler) {
  const f = vi.fn((url: string, init?: RequestInit) => Promise.resolve(h(url, init)));
  vi.stubGlobal("fetch", f);
  return f;
}
const renderApp = () => render(<MemoryRouter><App /></MemoryRouter>);

beforeEach(() => { vi.spyOn(window.parent, "postMessage").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("useSession", () => {
  it("loads /me", async () => {
    mockFetch(() => json(200, me));
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.me?.region).toBe("Helsinki region");
  });
  it("401 posts token-expired to the parent", async () => {
    mockFetch(() => err(401, "TOKEN_EXPIRED"));
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("expired"));
    expect(window.parent.postMessage).toHaveBeenCalledWith({ type: "token-expired" }, "*");
  });
});

describe("chat", () => {
  it("send renders optimistic user text, then assistant text + transaction_list", async () => {
    const f = mockFetch((url) => (url === "/api/me" ? json(200, me) : reply("Here you go", [txWidget])));
    renderApp();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "show my latest transactions" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("show my latest transactions")).toBeInTheDocument();
    expect(await screen.findByText("Here you go")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Latest transactions" })).toBeInTheDocument();
    const chatCall = f.mock.calls.find((c) => c[0] === "/api/chat")!;
    expect(JSON.parse((chatCall[1] as RequestInit).body as string)).toMatchObject({ message: "show my latest transactions", conversation_id: null });
  });

  it("chip click sends quick_action and a 501 renders as normal text", async () => {
    const f = mockFetch((url) => (url === "/api/me" ? json(200, me) : err(501, "NOT_IMPLEMENTED", "Coming soon")));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Plan my finances" }));
    expect(await screen.findByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    const chatCall = f.mock.calls.find((c) => c[0] === "/api/chat")!;
    expect(JSON.parse((chatCall[1] as RequestInit).body as string).quick_action).toBe("plan_my_finances");
  });

  it("API error shows a friendly message and retry works", async () => {
    let fail = true;
    mockFetch((url) => (url === "/api/me" ? json(200, me) : fail ? err(502, "LLM_UNAVAILABLE") : reply("Recovered")));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Understand my money" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Recovered")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("401 on chat posts token-expired", async () => {
    mockFetch((url) => (url === "/api/me" ? json(200, me) : err(401, "TOKEN_EXPIRED")));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Understand my money" }));
    await screen.findByRole("alert");
    expect(window.parent.postMessage).toHaveBeenCalledWith({ type: "token-expired" }, "*");
  });

  it("See all opens a paged list using the widget filter", async () => {
    const page = (n: number) => json(200, { items: transactionListMock.page.items.slice(0, 2), page: n, page_size: 20, total: 45, total_amount_cents: -312450 });
    const f = mockFetch((url) => (url === "/api/me" ? json(200, me) : url === "/api/chat" ? reply("Here", [txWidget]) : page(Number(new URL(url, "http://x").searchParams.get("page")))));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Understand my money" }));
    fireEvent.click(await screen.findByRole("button", { name: /see all/i }));
    expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(screen.getByTestId("see-all-totals").textContent).toMatch(/45 transactions/);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText(/Page 2 of 3/)).toBeInTheDocument();
    const urls = f.mock.calls.map((c) => c[0] as string).filter((u) => u.startsWith("/api/transactions"));
    expect(urls).toHaveLength(2);
    const q = new URL(urls[1], "http://x").searchParams;
    expect(q.get("from_date")).toBe("2026-09-01");
    expect(q.get("to_date")).toBe("2026-09-15");
    expect(q.get("page")).toBe("2");
  });
});

describe("useTransactions", () => {
  it("clamps page at 1 and refetches on page change", async () => {
    const f = mockFetch(() => json(200, { items: [], page: 1, page_size: 20, total: 0, total_amount_cents: 0 }));
    const { result } = renderHook(() => useTransactions({ flow: "spending" }));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    act(() => result.current.setPage(0));
    expect(result.current.page).toBe(1);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toContain("flow=spending");
  });
});
