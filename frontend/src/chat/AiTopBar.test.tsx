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
