import { getToken, setToken } from "./token";

beforeEach(() => setToken(null));

describe("token", () => {
  it("starts empty", () => {
    expect(getToken()).toBeNull();
  });

  it("holds the token in memory and can clear it", () => {
    setToken("abc");
    expect(getToken()).toBe("abc");
    setToken(null);
    expect(getToken()).toBeNull();
  });
});
