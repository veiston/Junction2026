import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import { registry, type WidgetHostApi } from "@/chat/registry";
import type { Widget } from "@/contracts";
import { mocks } from "@/dev/mocks";
import { widgets } from "@/slices/habits";
import { formatCents } from "@/widgets/common/Money";

import { habitsMocks } from "./mocks";

const TYPES = Object.keys(habitsMocks) as (keyof typeof habitsMocks)[];

function makeApi(request: jest.Mock = jest.fn()): WidgetHostApi {
  return { request: request as unknown as WidgetHostApi["request"], sendChat: jest.fn(), formatCents };
}

function show(type: string, data: unknown, api = makeApi()) {
  return render(<WidgetHost widget={{ id: `w_${type}`, version: 1, type, data } as Widget} api={api} />);
}

const norm = (s: string) => s.replace(/ | /g, " ");

describe("habits registration", () => {
  it("registers exactly the five habits widget types", () => {
    expect(Object.keys(widgets).sort()).toEqual([...TYPES].sort());
  });

  it("has a gallery mock and a registry entry for each type", () => {
    for (const t of TYPES) {
      expect(mocks[t]).toBeDefined();
      expect(registry[t]).toBeDefined();
    }
  });
});

describe("render from mocks", () => {
  it.each(TYPES)("%s renders", (type) => {
    show(type, habitsMocks[type]);
    expect(screen.toJSON()).not.toBeNull();
  });

  it("limit_progress shows spent and days left", () => {
    show("limit_progress", habitsMocks.limit_progress);
    expect(norm(screen.getByTestId("limit-spent").props.children)).toContain("274,00");
    expect(screen.getByText("15 days left this month.")).toBeTruthy();
  });

  it("limit_progress switches to the over state", () => {
    const over = { ...habitsMocks.limit_progress, status: "over", spent_cents: 60000, remaining_cents: -8000 };
    show("limit_progress", over);
    expect(screen.getByText(/Over the limit by/)).toBeTruthy();
  });

  it("limit_review shows saved amount when met and exceeded amount when not", () => {
    const { unmount } = show("limit_review", habitsMocks.limit_review);
    expect(norm(screen.getByTestId("limit-review-result").props.children)).toContain("saved");
    unmount();
    show("limit_review", { ...habitsMocks.limit_review, met: false, difference_cents: -3000 });
    expect(norm(screen.getByTestId("limit-review-result").props.children)).toContain("Over the limit by");
  });

  it("challenge_progress shows title, rule and status", () => {
    show("challenge_progress", habitsMocks.challenge_progress);
    expect(screen.getByText("Taxi-free week")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("No spending in this category")).toBeTruthy();
  });

  it.each(["won", "lost"] as const)("challenge_progress shows %s", (status) => {
    const d = { ...habitsMocks.challenge_progress, challenge: { ...habitsMocks.challenge_progress.challenge, status } };
    show("challenge_progress", d);
    expect(screen.getByTestId("challenge-status").props.children).toBe(status === "won" ? "Won" : "Lost");
  });

  it("challenge_suggestions shows at most 3 templates", () => {
    const base = habitsMocks.challenge_suggestions.items;
    show("challenge_suggestions", { items: [...base, { ...base[0], id: "extra" }] });
    expect(screen.getAllByText("Start", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("challenge-extra")).toBeNull();
    expect(screen.getByTestId("challenge-cafe_cap")).toBeTruthy();
  });
});

describe("empty or odd data does not crash", () => {
  it.each(TYPES)("%s with empty data", (type) => {
    expect(() => show(type, {})).not.toThrow();
  });
  it.each(TYPES)("%s with undefined data", (type) => {
    expect(() => show(type, undefined)).not.toThrow();
  });
  it("challenge_suggestions with no items shows a message", () => {
    show("challenge_suggestions", { items: [] });
    expect(screen.getByText("No challenges to suggest right now.")).toBeTruthy();
  });
});

describe("LimitSuggestion", () => {
  const suggestion = habitsMocks.limit_suggestion;

  it("starts at the suggested amount and the slider changes it", () => {
    show("limit_suggestion", suggestion);
    expect(norm(screen.getByTestId("limit-amount").props.children)).toContain("520,00");
    fireEvent.press(screen.getByLabelText("Increase limit"));
    expect(norm(screen.getByTestId("limit-amount").props.children)).toContain("530,00");
    fireEvent.press(screen.getByLabelText("Decrease limit"));
    fireEvent.press(screen.getByLabelText("Decrease limit"));
    expect(norm(screen.getByTestId("limit-amount").props.children)).toContain("510,00");
  });

  it("stops at the slider bounds", () => {
    show("limit_suggestion", { ...suggestion, suggested_cents: suggestion.max_cents });
    fireEvent.press(screen.getByLabelText("Increase limit"));
    expect(norm(screen.getByTestId("limit-amount").props.children)).toContain("800,00");
  });

  it("responds to accessibility increment", () => {
    show("limit_suggestion", suggestion);
    const slider = screen.getByLabelText("Monthly limit");
    act(() => slider.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    expect(norm(screen.getByTestId("limit-amount").props.children)).toContain("530,00");
  });

  it("Accept posts { month, amount_cents } and shows the confirmed limit", async () => {
    const request = jest.fn().mockResolvedValue({
      id: 7, month: "2026-09", basket: "everyday", amount_cents: 53000, status: "active", created_at: "2026-09-15T08:00:00Z",
    });
    show("limit_suggestion", suggestion, makeApi(request));
    fireEvent.press(screen.getByLabelText("Increase limit"));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Accept"));
    });
    expect(request).toHaveBeenCalledWith("POST", "/habits/limits", { month: "2026-09", amount_cents: 53000 });
    await waitFor(() => expect(screen.getByTestId("limit-confirmed")).toBeTruthy());
    expect(norm(screen.getByTestId("limit-confirmed").props.children)).toContain("530,00");
  });

  it("409 shows the already-set message", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "conflict" });
    show("limit_suggestion", suggestion, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Accept"));
    });
    expect(screen.getByText("You already set a limit for this month.")).toBeTruthy();
  });

  it("other errors show the server message and allow retry", async () => {
    const request = jest.fn().mockRejectedValue({ status: 0, message: "Cannot reach the server." });
    show("limit_suggestion", suggestion, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Accept"));
    });
    expect(screen.getByText("Cannot reach the server.")).toBeTruthy();
    expect(screen.getByLabelText("Accept").props.accessibilityState.disabled).toBe(false);
  });
});

describe("ChallengeSuggestions actions", () => {
  const data = habitsMocks.challenge_suggestions;

  it("Start posts the template id and shows started", async () => {
    const request = jest.fn().mockResolvedValue(habitsMocks.challenge_progress);
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start Cafe cap"));
    });
    expect(request).toHaveBeenCalledWith("POST", "/habits/challenges", { template_id: "cafe_cap" });
    expect(screen.getByText("Challenge started")).toBeTruthy();
  });

  it("409 says the challenge is already active", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "x" });
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start Taxi-free week"));
    });
    expect(screen.getByText("You already have this challenge running.")).toBeTruthy();
  });

  it("404 says the challenge is unavailable", async () => {
    const request = jest.fn().mockRejectedValue({ status: 404, message: "x" });
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start Taxi-free week"));
    });
    expect(screen.getByText("This challenge is no longer available.")).toBeTruthy();
  });
});
