import { fireEvent, render, screen } from "@testing-library/react-native";

import { AiTopBar } from "./AiTopBar";

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

describe("bell notices", () => {
  it("shows a dot and the notice, and tapping the notice reports it", () => {
    const onNotice = jest.fn();
    const notice = { id: "challenge-1", text: 'Your challenge "Taxis" has ended. See the result.' };
    render(<AiTopBar onBack={jest.fn()} notices={[notice]} onNotice={onNotice} />);
    expect(screen.getByTestId("bell-dot")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Notifications, 1 new"));
    fireEvent.press(screen.getByText(notice.text));
    expect(onNotice).toHaveBeenCalledWith(notice);
  });

  it("has no dot without notices", () => {
    render(<AiTopBar onBack={jest.fn()} />);
    expect(screen.queryByTestId("bell-dot")).toBeNull();
    fireEvent.press(screen.getByLabelText("Notifications"));
    expect(screen.getByText("No new notifications")).toBeTruthy();
  });
});
