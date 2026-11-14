import { act, renderHook, waitFor } from "@testing-library/react-native";

import { setToken } from "@/auth/token";

import { REFRESH_MS, useNotifications } from "./useNotifications";

const fetchMock = jest.fn();
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
const notice = (id: string) => ({
  id, kind: "spending_change", tone: "warning", title: "Everyday spending is up this week",
  text: "You spent 75 € …", ask: "What changed?", created_date: "2026-09-15",
});

beforeEach(() => {
  fetchMock.mockReset();
  setToken("tok");
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => jest.useRealTimers());

it("loads unread notices from the server", async () => {
  fetchMock.mockResolvedValue(json(200, { items: [notice("spending-2026-w38")], unread_count: 1 }));
  const { result } = renderHook(() => useNotifications(true, 0));
  await waitFor(() => expect(result.current.items.map((n) => n.id)).toEqual(["spending-2026-w38"]));
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/notifications$/);
});

it("does nothing before the session is ready", () => {
  renderHook(() => useNotifications(false, 0));
  expect(fetchMock).not.toHaveBeenCalled();
});

it("opening a notice hides it at once and marks it read on the server", async () => {
  fetchMock.mockResolvedValueOnce(json(200, { items: [notice("spending-2026-w38")], unread_count: 1 }));
  fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error("no body"); } });
  const { result } = renderHook(() => useNotifications(true, 0));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  act(() => result.current.dismiss("spending-2026-w38"));
  expect(result.current.items).toEqual([]);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const [url, init] = fetchMock.mock.calls[1];
  expect(url).toMatch(/\/notifications\/spending-2026-w38\/read$/);
  expect(init.method).toBe("POST");
});

it("checks again every minute and when the conversation moves", async () => {
  jest.useFakeTimers();
  fetchMock.mockResolvedValue(json(200, { items: [], unread_count: 0 }));
  const { rerender } = renderHook(({ key }: { key: number }) => useNotifications(true, key), {
    initialProps: { key: 0 },
  });
  await act(async () => {});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(REFRESH_MS);
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  rerender({ key: 1 });
  await act(async () => {});
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
