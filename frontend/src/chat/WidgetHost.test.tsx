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
    const api = show("challenge_progress", {
      ...(mocks.challenge_progress as object),
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

describe("the button asks what it says and the chat answers at once", () => {
  it("running challenge: the customer's message is the button text, the answer is the card's own numbers", () => {
    const { registerChatNote } = require("./chatNote");
    const seen: { text: string; question?: string }[] = [];
    const off = registerChatNote((text: string, question?: string) => seen.push({ text, question }));
    const api = show("challenge_progress", {
      ...(mocks.challenge_progress as object),
      concept: { id: "small_purchases_add_up", title: "Small purchases add up", text: "At EUR 99.26 a week it adds up to about EUR 5161.52 a year." },
    });
    expect(screen.getByText("What does this add up to in a year?")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Explain this card"));
    off();
    expect(seen).toEqual([
      { text: "At EUR 99.26 a week it adds up to about EUR 5161.52 a year.", question: "What does this add up to in a year?" },
    ]);
    expect(api.sendChat).not.toHaveBeenCalled();
  });

  it("suggestion: why this goal is answered from its own numbers", () => {
    const { registerChatNote } = require("./chatNote");
    const seen: { text: string; question?: string }[] = [];
    const off = registerChatNote((text: string, question?: string) => seen.push({ text, question }));
    show("challenge_suggestions", mocks.challenge_suggestions);
    fireEvent.press(screen.getByLabelText("Explain this card"));
    off();
    expect(seen[0].question).toBe("Why this goal?");
    expect(seen[0].text).toMatch(/half of what you spent.*99,26.*49,00/);
  });
});
