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

  it("challenge_progress active shows spent vs target and days left", () => {
    show("challenge_progress", habitsMocks.challenge_progress);
    expect(screen.getByText("Halve your taxi spending for 7 days")).toBeTruthy();
    expect(screen.getByLabelText(/Spent so far/)).toBeTruthy();
    expect(screen.getByLabelText(/Your goal /)).toBeTruthy();
    expect(screen.getByText("3 days left · doing well")).toBeTruthy();
    expect(screen.queryByText("Small purchases add up")).toBeNull(); // explained by the Explain button, not twice
  });

  it("challenge_progress active at risk", () => {
    show("challenge_progress", { ...habitsMocks.challenge_progress, on_track: false });
    expect(screen.getByText("3 days left · careful")).toBeTruthy();
  });

  it("challenge_suggestions shows baseline, target, estimates and concept", () => {
    show("challenge_suggestions", habitsMocks.challenge_suggestions);
    expect(screen.getByTestId("baseline-taxi_half_week")).toBeTruthy();
    expect(screen.getByLabelText(/Last 7 days .*99,26/)).toBeTruthy();
    expect(screen.getByLabelText(/Goal .*49,00/)).toBeTruthy();
    expect(screen.getByText(/99,26.*→.*49,00/)).toBeTruthy();
  });

  it("challenge_suggestions shows one habit at a time", () => {
    const base = habitsMocks.challenge_suggestions.items;
    show("challenge_suggestions", { items: [...base, { ...base[1], id: "third" }] });
    expect(screen.getAllByText("Start the 7-day challenge").length).toBe(1);
    expect(screen.queryByTestId("challenge-third")).toBeNull();
  });
});

describe("finished experiment", () => {
  it("won shows target met, before vs now and the difference", () => {
    show("challenge_progress", challengeProgressWonMock);
    expect(screen.getByText("You reached your goal")).toBeTruthy();
    expect(screen.getByLabelText(/Week before .*99,26/)).toBeTruthy();
    expect(screen.getByLabelText(/This week .*38,81/)).toBeTruthy();
    expect(norm(screen.getByTestId("challenge-difference").props.children)).toContain("60,45");
    expect(norm(screen.getByTestId("challenge-difference").props.children)).toContain("less than the week before");
    expect(screen.queryByText("One week is not proof")).toBeNull();
  });

  it("lost shows an increase, never a saving", () => {
    show("challenge_progress", challengeProgressLostMock);
    expect(screen.getByText("You did not reach your goal this time")).toBeTruthy();
    const text = norm(screen.getByTestId("challenge-difference").props.children);
    expect(text).toContain("more than the week before");
    expect(text).toContain("24,74");
    expect(text).not.toMatch(/saved|saving|less than/);
  });

  it("Repeat for 7 days starts the same template", async () => {
    const request = jest.fn().mockResolvedValue(habitsMocks.challenge_progress);
    show("challenge_progress", challengeProgressWonMock, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Try again for 7 days"));
    });
    expect(request).toHaveBeenCalledWith("POST", "/habits/challenges", { template_id: "taxi_half_week" });
    expect(screen.getByText("Started")).toBeTruthy();
  });

  it("Repeat for 7 days shows the 409 message", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "x" });
    show("challenge_progress", challengeProgressWonMock, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Try again for 7 days"));
    });
    expect(screen.getByText("You already have this challenge running.")).toBeTruthy();
  });

  it("Try a new challenge sends the chat message", () => {
    const api = makeApi();
    show("challenge_progress", challengeProgressWonMock, api);
    fireEvent.press(screen.getByLabelText("Try a new challenge"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Show me another challenge to try" });
  });

  it("old data without the new fields does not crash", () => {
    const old = { ...challengeProgressWonMock };
    for (const k of ["baseline_cents", "baseline_count", "difference_cents", "change_pct", "concept", "next_step"] as const) {
      delete old[k];
    }
    expect(() => show("challenge_progress", old)).not.toThrow();
    expect(screen.getByText("You reached your goal")).toBeTruthy();
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
    expect(screen.getByText("Try a new challenge")).toBeTruthy();
  });

  it("template with null new fields renders without baseline or concept", () => {
    const t = { ...habitsMocks.challenge_suggestions.items[0], baseline_cents: null, baseline_count: null, yearly_saving_cents: null, concept: null };
    expect(() => show("challenge_suggestions", { items: [t] })).not.toThrow();
    expect(screen.queryByTestId("baseline-taxi_half_week")).toBeNull();
    expect(screen.queryByText("Yearly estimate")).toBeNull();
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
      fireEvent.press(screen.getByLabelText(/Start the 7-day challenge: /));
    });
    expect(request).toHaveBeenCalledWith("POST", "/habits/challenges", { template_id: "taxi_half_week" });
    expect(screen.getByText("Started")).toBeTruthy();
  });

  it("409 says the challenge is already active", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "x" });
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/Start the 7-day challenge: /));
    });
    expect(screen.getByText("You already have this challenge running.")).toBeTruthy();
  });

  it("404 says the challenge is unavailable", async () => {
    const request = jest.fn().mockRejectedValue({ status: 404, message: "x" });
    show("challenge_suggestions", data, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/Start the 7-day challenge: /));
    });
    expect(screen.getByText("This challenge is no longer available.")).toBeTruthy();
  });
});

describe("experiment flow through the chat", () => {
  it("Check progress asks the chat after the experiment started", async () => {
    const request = jest.fn().mockResolvedValue(habitsMocks.challenge_progress);
    const api = makeApi(request);
    show("challenge_suggestions", habitsMocks.challenge_suggestions, api);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/Start the 7-day challenge: /));
    });
    fireEvent.press(screen.getByLabelText("Check progress"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "How is my challenge going?" });
  });
});

describe("another challenge", () => {
  it("is on the suggestion before it is accepted and asks for another challenge", () => {
    const api = makeApi();
    show("challenge_suggestions", habitsMocks.challenge_suggestions, api);
    fireEvent.press(screen.getByLabelText("Another challenge"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Show me another challenge to try" });
  });

  it("is not on a running challenge: that one can only be skipped", () => {
    show("challenge_progress", habitsMocks.challenge_progress);
    expect(screen.queryByLabelText("Another challenge")).toBeNull();
    expect(screen.queryByLabelText("Try a new challenge")).toBeNull();
    expect(screen.getByLabelText("Skip challenge")).toBeTruthy();
  });
});

describe("what the assistant is told after Start", () => {
  it("asks the assistant, with the goal and how it works as facts", async () => {
    const { registerChatAsk } = require("@/chat/chatAsk");
    const seen: { question: string; facts: string }[] = [];
    const off = registerChatAsk((question: string, facts: string) => seen.push({ question, facts }));
    const request = jest.fn().mockResolvedValue(habitsMocks.challenge_progress);
    show("challenge_suggestions", habitsMocks.challenge_suggestions, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/Start the 7-day challenge: /));
    });
    off();
    expect(seen).toHaveLength(1);
    expect(seen[0].question).toBe("I started the challenge. What happens now?");
    expect(seen[0].facts).toMatch(/no more than .*49,00/);
    expect(seen[0].facts).toContain("nothing is blocked and no money moves");
    expect(seen[0].facts).toContain("red dot on the bell");
  });
});

describe("stop challenge", () => {
  it("stops the running challenge, tells the assistant and hides the buttons", async () => {
    const { registerChatAsk } = require("@/chat/chatAsk");
    const asked: string[][] = [];
    const off = registerChatAsk((q: string, f: string) => asked.push([q, f]));
    const request = jest.fn().mockResolvedValue({});
    const api = makeApi(request);
    show("challenge_progress", habitsMocks.challenge_progress, api);
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Skip challenge"));
    });
    off();
    const id = (habitsMocks.challenge_progress as { challenge: { id: number } }).challenge.id;
    expect(request).toHaveBeenCalledWith("POST", `/habits/challenges/${id}/stop`);
    expect(asked[0][0]).toBe("I skipped the challenge. What now?");
    expect(asked[0][1]).toMatch(/skipped their 7-day challenge/);
    expect(screen.getByText("Challenge skipped. There is no result and nothing is lost.")).toBeTruthy();
    expect(screen.queryByLabelText("Skip challenge")).toBeNull();
  });

  it("shows an error and keeps the button when stopping fails", async () => {
    const request = jest.fn().mockRejectedValue({ status: 409, message: "x" });
    show("challenge_progress", habitsMocks.challenge_progress, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Skip challenge"));
    });
    expect(screen.getByText("Could not skip the challenge. Try again.")).toBeTruthy();
    expect(screen.getByLabelText("Skip challenge")).toBeTruthy();
  });

  it("a finished challenge has no stop button", () => {
    show("challenge_progress", challengeProgressWonMock);
    expect(screen.queryByLabelText("Skip challenge")).toBeNull();
  });
});

describe("stop right after Start", () => {
  it("the started suggestion has a Skip challenge button that ends the new challenge", async () => {
    const { registerChatAsk } = require("@/chat/chatAsk");
    const asked: string[][] = [];
    const off = registerChatAsk((q: string, f: string) => asked.push([q, f]));
    const request = jest.fn().mockResolvedValue(habitsMocks.challenge_progress);
    show("challenge_suggestions", habitsMocks.challenge_suggestions, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/Start the 7-day challenge: /));
    });
    expect(screen.getByText("Started")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Skip challenge"));
    });
    off();
    const id = (habitsMocks.challenge_progress as { challenge: { id: number } }).challenge.id;
    expect(request).toHaveBeenLastCalledWith("POST", `/habits/challenges/${id}/stop`);
    expect(screen.getByText("Challenge skipped. There is no result and nothing is lost.")).toBeTruthy();
    expect(screen.queryByLabelText("Check progress")).toBeNull();
    expect(asked.map((a) => a[0])).toContain("I skipped the challenge. What now?");
  });
});

describe("after a skip", () => {
  it("shows a short note and no buttons", async () => {
    const request = jest.fn().mockResolvedValue({});
    show("challenge_progress", habitsMocks.challenge_progress, makeApi(request));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Skip challenge"));
    });
    expect(screen.getByText("Challenge skipped. There is no result and nothing is lost.")).toBeTruthy();
    expect(screen.queryByLabelText("Skip challenge")).toBeNull();
    expect(screen.queryByLabelText("Another challenge")).toBeNull();
    expect(screen.queryByLabelText("Check progress")).toBeNull();
  });
});
