import { fireEvent, render, screen } from "@testing-library/react-native";

import { getModelProvider, setModelProvider } from "@/api/modelProvider";

import ProfileScreen from "../app/mina";

jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));

beforeEach(() => setModelProvider("cloud"));

describe("Minä screen", () => {
  it("the switch changes the chat model between cloud and local", () => {
    render(<ProfileScreen />);
    const toggle = screen.getByLabelText("Use local model");
    expect(toggle.props.value).toBe(false);
    fireEvent(toggle, "valueChange", true);
    expect(getModelProvider()).toBe("local");
    fireEvent(screen.getByLabelText("Use local model"), "valueChange", false);
    expect(getModelProvider()).toBe("cloud");
  });
});
