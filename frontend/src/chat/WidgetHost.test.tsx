import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Widget } from "@/contracts";
import { mocks } from "@/dev/mocks";
import { formatCents } from "@/widgets/common/Money";

import { WidgetHost } from "./WidgetHost";
import type { WidgetHostApi } from "./registry";

function makeApi(): WidgetHostApi {
  return { request: jest.fn(), sendChat: jest.fn(), formatCents };
}

function show(type: string, data: unknown, api = makeApi()) {
  render(<WidgetHost widget={{ id: "w", version: 1, type, data } as Widget} api={api} />);
  return api;
}

describe("Explain button", () => {
  it("shows under a widget and sends the explain message", () => {
    const api = show("transaction_list", mocks.transaction_list);
    const button = screen.getByLabelText("Explain this card");
    expect(button.props.style).toMatchObject({ minHeight: 44, minWidth: 44 });
    fireEvent.press(button);
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Explain in simple words: my latest transactions" });
  });

  it("works on widget types that have no component yet", () => {
    const api = show("what_if", {});
    expect(screen.getByTestId("widget-fallback")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Explain this card"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Explain in simple words: this what-if" });
  });

  it("names the concept when the widget carries one", () => {
    const api = show("limit_progress", {
      ...(mocks.limit_progress as object),
      concept: { id: "spending_pace", title: "t", text: "x" },
    });
    fireEvent.press(screen.getByLabelText("Explain this card"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Explain in simple words: t" });
  });

  it("is absent on concept_note", () => {
    show("concept_note", mocks.concept_note);
    expect(screen.queryByLabelText("Explain this card")).toBeNull();
  });
});

describe("question buttons send the card's numbers with the question", () => {
  function capture() {
    const { registerChatAsk } = require("./chatAsk");
    const seen: { text: string; question: string }[] = [];
    const off = registerChatAsk((question: string, text: string) => seen.push({ text, question }));
    return { seen, off };
  }
  const ask = (q: string) => fireEvent.press(screen.getByLabelText(q));

  it("suggestion: habit, goal, gain and how it works", () => {
    const { seen, off } = capture();
    const api = show("challenge_suggestions", mocks.challenge_suggestions);
    ["Why this habit?", "Why this goal?", "What do I gain?", "How does it work?"].forEach(ask);
    off();
    expect(seen.map((s) => s.question)).toEqual(["Why this habit?", "Why this goal?", "What do I gain?", "How does it work?"]);
    expect(seen[0].text).toMatch(/regular everyday cost/);
    expect(seen[1].text).toMatch(/half of last week: .*49,00/);
    expect(seen[2].text).toMatch(/keep about .*50,26/);
    expect(seen[3].text).toMatch(/Nothing is blocked and no money moves/);
    expect(api.sendChat).not.toHaveBeenCalled();
  });

  it("running challenge: what to do, how am I doing, how I win, what if I go over", () => {
    const { seen, off } = capture();
    show("challenge_progress", mocks.challenge_progress);
    ["What do I do now?", "How am I doing?", "How will I know I won?", "What if I go over?"].forEach(ask);
    off();
    expect(seen[0].text).toMatch(/live as usual/);
    expect(seen[1].text).toMatch(/So far you spent/);
    expect(seen[2].text).toMatch(/no more than .*49,00/);
    expect(seen[3].text).toMatch(/Nothing bad happens/);
  });

  it("finished challenge: this week against the week before, never a saving when spending rose", () => {
    const { seen, off } = capture();
    const base = mocks.challenge_progress as { challenge: object };
    show("challenge_progress", { ...base, challenge: { ...base.challenge, status: "lost" }, current_amount_cents: 12400, baseline_cents: 9926 });
    ["What next?", "What does the result mean?", "Is one good week enough?"].forEach(ask);
    off();
    expect(seen[1].text).toMatch(/124,00.*99,26/);
    expect(seen[1].text).toMatch(/did not reach your goal/);
    expect(seen[1].text).not.toMatch(/saved|saving/);
    expect(seen[2].text).toMatch(/good sign, not proof/);
  });
});
