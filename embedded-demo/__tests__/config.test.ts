import { describe, expect, it } from "vitest";

import {
  buildCoachUrl,
  describeSessionError,
  isTokenExpiredMessage,
  sessionEndpoint,
} from "../src/config";

describe("buildCoachUrl", () => {
  it("puts the token in the fragment", () => {
    expect(buildCoachUrl("http://localhost:5173", "a.b.c")).toBe("http://localhost:5173#token=a.b.c");
  });
  it("replaces an existing fragment and encodes the token", () => {
    expect(buildCoachUrl("http://x/#old", "a b")).toBe("http://x/#token=a%20b");
  });
});

describe("sessionEndpoint", () => {
  it("joins without double slashes", () => {
    expect(sessionEndpoint("http://h/api/v1/")).toBe("http://h/api/v1/demo/session");
  });
});

describe("describeSessionError", () => {
  it("maps statuses", () => {
    expect(describeSessionError(null, 404)).toMatch(/not found/i);
    expect(describeSessionError(null, 500)).toContain("500");
  });
  it("maps network failure", () => {
    expect(describeSessionError(new TypeError("x"))).toMatch(/reach/i);
  });
});

describe("isTokenExpiredMessage", () => {
  it("accepts object and JSON string", () => {
    expect(isTokenExpiredMessage({ type: "token-expired" })).toBe(true);
    expect(isTokenExpiredMessage('{"type":"token-expired"}')).toBe(true);
  });
  it("rejects others", () => {
    expect(isTokenExpiredMessage("nope")).toBe(false);
    expect(isTokenExpiredMessage(null)).toBe(false);
    expect(isTokenExpiredMessage({ type: "x" })).toBe(false);
  });
});
