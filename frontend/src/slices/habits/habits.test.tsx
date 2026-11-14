import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import { registry, type WidgetHostApi } from "@/chat/registry";
import type { Widget } from "@/contracts";
import { mocks } from "@/dev/mocks";
import { widgets } from "@/slices/habits";
import { formatCents } from "@/widgets/common/Money";

import { challengeProgressLostMock, challengeProgressWonMock, habitsMocks } from "./mocks";

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

  it("challenge_progress active shows spent vs target, days left and the concept", () => {
    show("challenge_progress", habitsMocks.challenge_progress);
    expect(screen.getByText("Halve your taxi spending for 7 days")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByLabelText(/Spent so far/)).toBeTruthy();
    expect(screen.getByLabelText(/Target /)).toBeTruthy();
    expect(screen.getByText("3 days left, on track.")).toBeTruthy();
    expect(screen.getByText("Spending pace")).toBeTruthy();
  });

  it("challenge_progress active at risk", () => {
    show("challenge_progress", { ...habitsMocks.challenge_progress, on_track: false });
    expect(screen.getByText("3 days left, at risk.")).toBeTruthy();
  });

  it("challenge_suggestions shows baseline, target, estimates and concept", () => {
    show("challenge_suggestions", habitsMocks.challenge_suggestions);
    expect(screen.getByTestId("baseline-taxi_half_week")).toBeTruthy();
    expect(screen.getByLabelText(/Before: last 7 days \(3 purchases\) .*99,26/)).toBeTruthy();
    expect(screen.getByLabelText(/Target: next 7 days .*49,00/)).toBeTruthy();
    expect(screen.getByText(/Possible saving: .*50,26/)).toBeTruthy();
    expect(screen.getByText(/Estimate: about .*2 613,52.* a year/)).toBeTruthy();
    expect(screen.getByText("Small purchases add up")).toBeTruthy();
  });

  it("challenge_suggestions shows at most 3 templates", () => {
    const base = habitsMocks.challenge_suggestions.items;
    show("challenge_suggestions", { items: [...base, { ...base[1], id: "third" }, { ...base[1], id: "extra" }] });
    expect(screen.getAllByText("Start experiment").length).toBe(3);
    expect(screen.queryByTestId("challenge-extra")).toBeNull();
    expect(screen.getByTestId("challenge-cafe_cap")).toBeTruthy();
  });
});

describe("finished experiment", () => {
  it("won shows target met, before vs now, the difference and the concept", () => {
    show("challenge_progress", challengeProgressWonMock);
    expect(screen.getByTestId("challenge-status").props.children).toBe("Won");
    expect(screen.getByText("Target met")).toBeTruthy();
    expect(screen.getByLabelText(/Before .*99,26/)).toBeTruthy();
    expect(screen.getByLabelText(/Now .*38,81/)).toBeTruthy();
    expect(norm(screen.getByTestId("challenge-difference").props.children)).toContain("60,45");
    expect(norm(screen.getByTestId("challenge-difference").props.children)).toContain("less than before");
    expect(screen.getByText("Change in spending: -60,9 %")).toBeTruthy();
    expect(screen.getByText("One week is not proof")).toBeTruthy();
    expect(screen.getByText(/Repeat the experiment for another 7 days/)).toBeTruthy();
  });

  it("lost shows an increase, never a saving", () => {
    show("challenge_progress", challengeProgressLostMock);
    expect(screen.getByTestId("challenge-status").props.children).toBe("Lost");
    expect(screen.getByText("Target not met")).toBeTruthy();
    const text = norm(screen.getByTestId("challenge-difference").props.children);
    expect(text).toContain("increased by");
    expect(text).toContain("24,74");
    expect(text).not.toMatch(/saved|saving|less than/);
    expect(screen.getByText("Change in spending: +24,9 %")).toBeTruthy();
  });

  it("Repeat for 7 days starts the same template", async () => {
    const request = jest.fn().mockResolvedValue(habitsMocks.challenge_progress);
    show("challenge_progress", challengeProgressWonMock, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Repeat for 7 days"));
    });
    expect(request).toHaveBeenCalledWith("POST", "/habits/challenges", { template_id: "taxi_half_week" });
    expect(screen.getByText("Experiment started")).toBeTruthy();
  });

  it("Repeat for 7 days shows the 409 message", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "x" });
    show("challenge_progress", challengeProgressWonMock, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Repeat for 7 days"));
    });
    expect(screen.getByText("You already have this challenge running.")).toBeTruthy();
  });

  it("Try another category sends the chat message", () => {
    const api = makeApi();
    show("challenge_progress", challengeProgressWonMock, api);
    fireEvent.press(screen.getByLabelText("Try another category"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Show me another habit to test" });
  });

  it("old data without the new fields does not crash", () => {
    const old = { ...challengeProgressWonMock };
    for (const k of ["baseline_cents", "baseline_count", "difference_cents", "change_pct", "concept", "next_step"] as const) {
      delete old[k];
    }
    expect(() => show("challenge_progress", old)).not.toThrow();
    expect(screen.getByText("Target met")).toBeTruthy();
  });

  it("explicit nulls do not crash", () => {
    const nulls = {
      ...challengeProgressWonMock,
      baseline_cents: null,
      baseline_count: null,
      difference_cents: null,
      change_pct: null,
      concept: null,
      next_step: null,
    };
    expect(() => show("challenge_progress", nulls)).not.toThrow();
    expect(screen.getByText("Try another category")).toBeTruthy();
  });

  it("template with null new fields renders without baseline or concept", () => {
    const t = { ...habitsMocks.challenge_suggestions.items[0], baseline_cents: null, baseline_count: null, yearly_saving_cents: null, concept: null };
    expect(() => show("challenge_suggestions", { items: [t] })).not.toThrow();
    expect(screen.queryByTestId("baseline-taxi_half_week")).toBeNull();
    expect(screen.queryByText(/Estimate:/)).toBeNull();
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
    expect(screen.getByText("No habit to test right now.")).toBeTruthy();
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
      fireEvent.press(screen.getByLabelText("Start experiment: Cafe cap"));
    });
    expect(request).toHaveBeenCalledWith("POST", "/habits/challenges", { template_id: "cafe_cap" });
    expect(screen.getByText("Experiment started")).toBeTruthy();
  });

  it("409 says the challenge is already active", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "x" });
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start experiment: Halve your taxi spending for 7 days"));
    });
    expect(screen.getByText("You already have this challenge running.")).toBeTruthy();
  });

  it("404 says the challenge is unavailable", async () => {
    const request = jest.fn().mockRejectedValue({ status: 404, message: "x" });
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start experiment: Halve your taxi spending for 7 days"));
    });
    expect(screen.getByText("This challenge is no longer available.")).toBeTruthy();
  });
});
