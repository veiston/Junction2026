import { beforeEach, describe, expect, it } from "vitest";
import { consumeTokenFromUrl, getToken, setToken } from "./token";

beforeEach(() => {
  setToken(null);
  window.history.replaceState(null, "", "/");
});

describe("token", () => {
  it("reads #token= into memory and clears it from the URL", () => {
    window.history.replaceState(null, "", "/?a=1#token=xyz");
    expect(consumeTokenFromUrl()).toBe("xyz");
    expect(getToken()).toBe("xyz");
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("?a=1");
  });

  it("returns null when absent", () => {
    expect(consumeTokenFromUrl()).toBeNull();
  });
});
