import { fireEvent, render, screen } from "@testing-library/react-native";

import { AiTopBar } from "./AiTopBar";
import type { Notice } from "./useNotifications";

describe("AiTopBar", () => {
  it("the back button leaves the coach", () => {
    const onBack = jest.fn();
    render(<AiTopBar onBack={onBack} />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("has no menu button", () => {
    render(<AiTopBar onBack={jest.fn()} />);
    expect(screen.queryByLabelText("Menu")).toBeNull();
  });
});

const spending: Notice = {
  id: "spending-2026-w38",
  kind: "spending_change",
  tone: "warning",
  title: "Everyday spending is up this week",
  text: "You spent 75 € on everyday things in the last 7 days, 150 % more than the week before.",
  ask: "My everyday spending went up this week. What changed, and what can I do to stay on track?",
  created_date: "2026-09-15",
};

describe("bell notices", () => {
  it("shows a red dot, the title and text, and tapping the notice reports it", () => {
    const onNotice = jest.fn();
    render(<AiTopBar onBack={jest.fn()} notices={[spending]} onNotice={onNotice} />);
    expect(screen.getByTestId("bell-dot")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Notifications, 1 new"));
    expect(screen.getByText(spending.title)).toBeTruthy();
    fireEvent.press(screen.getByText(spending.text));
    expect(onNotice).toHaveBeenCalledWith(spending);
    expect(screen.queryByTestId("bell-list")).toBeNull(); // the list closes
  });

  it("says how many are new", () => {
    const suggestion: Notice = { ...spending, id: "suggest-2026-09-15", kind: "challenge_suggestion", tone: "info",
      title: "Ready for a small challenge?", text: "Try a week without taxis.", ask: "Suggest a challenge for me" };
    render(<AiTopBar onBack={jest.fn()} notices={[spending, suggestion]} />);
    expect(screen.getByLabelText("Notifications, 2 new")).toBeTruthy();
  });

  it("has no dot without notices", () => {
    render(<AiTopBar onBack={jest.fn()} />);
    expect(screen.queryByTestId("bell-dot")).toBeNull();
    fireEvent.press(screen.getByLabelText("Notifications"));
    expect(screen.getByText("No new notifications")).toBeTruthy();
  });
});
