import { act, renderHook } from "@testing-library/react-native";

import { getModelProvider, setModelProvider, useModelProvider } from "./modelProvider";

beforeEach(() => setModelProvider("cloud"));

describe("model provider", () => {
  it("starts on the cloud model", () => {
    expect(getModelProvider()).toBe("cloud");
  });

  it("the hook follows changes", () => {
    const { result } = renderHook(() => useModelProvider());
    expect(result.current).toBe("cloud");
    act(() => setModelProvider("local"));
    expect(result.current).toBe("local");
  });
});
