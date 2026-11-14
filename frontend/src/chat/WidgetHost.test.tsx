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
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Explain this: transaction_list" });
  });

  it("works on widget types that have no component yet", () => {
    const api = show("what_if", {});
    expect(screen.getByTestId("widget-fallback")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Explain this card"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Explain this: what_if" });
  });

  it("sends the concept id when the widget carries a concept", () => {
    const api = show("challenge_progress", {
      ...(mocks.challenge_progress as object),
      concept: { id: "spending_pace", title: "t", text: "x" },
    });
    fireEvent.press(screen.getByLabelText("Explain this card"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Explain the concept: spending_pace" });
  });

  it("is absent on concept_note", () => {
    show("concept_note", mocks.concept_note);
    expect(screen.queryByLabelText("Explain this card")).toBeNull();
  });
});
