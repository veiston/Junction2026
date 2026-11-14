import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { setToken } from "@/auth/token";
import { registerChatAsk } from "@/chat/chatAsk";
import { habitsMocks } from "@/slices/habits/mocks";

import { DEV_PURPLE, DevPanel } from "./DevPanel";

const fetchMock = jest.fn();
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  setToken("tok");
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe("DevPanel", () => {
  it("is a purple floating button", () => {
    render(<DevPanel />);
    const button = screen.getByLabelText("DEV: finish challenge");
    expect(button).toBeTruthy();
    const flat = JSON.stringify(button.props.style);
    expect(flat).toContain(DEV_PURPLE);
  });

  it("moves the demo clock to the end of the running challenge and asks the coach for the result", async () => {
    const progress = habitsMocks.challenge_progress as { challenge: { end_date: string } };
    fetchMock.mockResolvedValueOnce(json(200, { items: [progress] })).mockResolvedValueOnce(json(200, { today: progress.challenge.end_date }));
    const asked: string[][] = [];
    const off = registerChatAsk((q: string, f: string) => asked.push([q, f]));
    render(<DevPanel />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText("DEV: finish challenge"));
    });
    await waitFor(() => expect(asked).toHaveLength(1));
    off();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT", body: JSON.stringify({ today: progress.challenge.end_date }) });
    expect(asked[0]).toEqual(["How is my challenge going?", ""]);
  });

  it("says so when no challenge is running", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { items: [] }));
    render(<DevPanel />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText("DEV: finish challenge"));
    });
    await waitFor(() => expect(screen.getByText("No running challenge")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
