import { setToken } from "@/auth/token";
import { setModelProvider } from "./modelProvider";
import { api, ApiError, CHAT_TIMEOUT_MS, request } from "./client";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  setToken(null);
  setModelProvider("cloud");
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

describe("request", () => {
  it("sends the bearer token and hits the configured base URL", async () => {
    setToken("tok");
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await expect(request("GET", "/me")).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/me");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("sends no Authorization header without a token and serialises JSON bodies", async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await request("POST", "/x", { a: 1 });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("asks for the local model on chat requests only when it is switched on", async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await request("POST", "/chat", { message: "hi" });
    expect(fetchMock.mock.calls[0][1].headers["X-Model-Provider"]).toBeUndefined();
    setModelProvider("local");
    await request("POST", "/chat", { message: "hi" });
    await request("GET", "/me");
    expect(fetchMock.mock.calls[1][1].headers["X-Model-Provider"]).toBe("local");
    expect(fetchMock.mock.calls[2][1].headers["X-Model-Provider"]).toBeUndefined();
  });

  it("throws ApiError with the server error body", async () => {
    const error = { code: "UNAUTHORIZED", message: "nope", details: [], request_id: "r1" };
    fetchMock.mockResolvedValue(json(401, { error }));
    await expect(request("GET", "/me")).rejects.toMatchObject({ name: "ApiError", status: 401, body: error });
  });

  it("falls back to a generic error for non-JSON failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("html"); } });
    await expect(request("GET", "/me")).rejects.toMatchObject({ status: 502, body: { code: "INTERNAL_ERROR" } });
  });

  it("maps network failure to ApiError status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("down"));
    const err: unknown = await request("GET", "/me").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
  });
});

describe("api helpers", () => {
  it("createDemoSession posts the customer id", async () => {
    fetchMock.mockResolvedValue(json(200, { token: "t", expires_at: "x" }));
    await api.createDemoSession("CUST00001");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/demo/session");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"customer_id":"CUST00001"}');
  });
});

describe("timeouts", () => {
  afterEach(() => jest.useRealTimers());

  const abortable = (_url: string, init: { signal: AbortSignal }) =>
    new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));

  it("gives up after the default 10 s with a 'took too long' message", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(abortable);
    const result = request("GET", "/me").catch((e) => e);
    await jest.advanceTimersByTimeAsync(10_000);
    const err = await result;
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe("The server took too long to answer.");
  });

  it("a longer limit keeps waiting past 10 s (chat waits for Gemini)", async () => {
    jest.useFakeTimers();
    let resolveFetch: (v: unknown) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((r) => (resolveFetch = r)));
    const result = request("POST", "/chat", {}, CHAT_TIMEOUT_MS);
    await jest.advanceTimersByTimeAsync(15_000);
    resolveFetch(json(200, { ok: true }));
    await expect(result).resolves.toEqual({ ok: true });
  });
});
