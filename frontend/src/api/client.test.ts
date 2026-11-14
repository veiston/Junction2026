import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./client";
import { setToken } from "../auth/token";

afterEach(() => {
  vi.unstubAllGlobals();
  setToken(null);
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("api.request", () => {
  it("adds the Bearer token and returns JSON", async () => {
    setToken("abc");
    const f = vi.fn().mockResolvedValue(json(200, { ok: 1 }));
    vi.stubGlobal("fetch", f);
    await expect(request("GET", "/me")).resolves.toEqual({ ok: 1 });
    expect(f.mock.calls[0][0]).toBe("/api/me");
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer abc");
  });

  it("maps ErrorResponse to ApiError", async () => {
    const error = { code: "UNAUTHORIZED", message: "Nope", details: [], request_id: "r1" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, { error })));
    const err = await request<never>("GET", "/me").catch((e: ApiError) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.body.code).toBe("UNAUTHORIZED");
  });

  it("falls back to INTERNAL_ERROR on non-JSON failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const err = await request<never>("POST", "/chat", {}).catch((e: ApiError) => e);
    expect(err.body.code).toBe("INTERNAL_ERROR");
  });
});
