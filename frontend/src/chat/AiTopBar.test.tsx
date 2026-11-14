import { fireEvent, render, screen } from "@testing-library/react-native";

import { AiTopBar } from "./AiTopBar";

describe("AiTopBar", () => {
  it("the back button leaves the coach", () => {
    const onBack = jest.fn();
    render(<AiTopBar onBack={onBack} onShowFunctions={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("Back to main page"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("the menu is closed at first and opens from the top button", () => {
    render(<AiTopBar onBack={jest.fn()} onShowFunctions={jest.fn()} />);
    expect(screen.queryByText("Back to the three functions")).toBeNull();
    fireEvent.press(screen.getByLabelText("Menu"));
    expect(screen.getByText("Back to the three functions")).toBeTruthy();
  });

  it("choosing the item brings back the three functions and closes the menu", () => {
    const onShowFunctions = jest.fn();
    render(<AiTopBar onBack={jest.fn()} onShowFunctions={onShowFunctions} />);
    fireEvent.press(screen.getByLabelText("Menu"));
    fireEvent.press(screen.getByText("Back to the three functions"));
    expect(onShowFunctions).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Back to the three functions")).toBeNull();
  });
});

describe("bell notices", () => {
  it("shows a dot and the notice, and tapping the notice reports it", () => {
    const onNotice = jest.fn();
    const notice = { id: "challenge-1", text: 'Your challenge "Taxis" has ended. See the result.' };
    render(<AiTopBar onBack={jest.fn()} onShowFunctions={jest.fn()} notices={[notice]} onNotice={onNotice} />);
    expect(screen.getByTestId("bell-dot")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Notifications, 1 new"));
    fireEvent.press(screen.getByText(notice.text));
    expect(onNotice).toHaveBeenCalledWith(notice);
  });

  it("has no dot without notices", () => {
    render(<AiTopBar onBack={jest.fn()} onShowFunctions={jest.fn()} />);
    expect(screen.queryByTestId("bell-dot")).toBeNull();
    fireEvent.press(screen.getByLabelText("Notifications"));
    expect(screen.getByText("No new notifications")).toBeTruthy();
  });
});
