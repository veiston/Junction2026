import { setToken } from "@/auth/token";
import { api, ApiError, request } from "./client";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  setToken(null);
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
