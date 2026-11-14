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

  it("the LiteRT switch picks LiteRT, and back to the cloud model when turned off", () => {
    render(<ProfileScreen />);
    expect(screen.getByLabelText("Use LiteRT model").props.value).toBe(false);
    fireEvent(screen.getByLabelText("Use LiteRT model"), "valueChange", true);
    expect(getModelProvider()).toBe("litert");
    fireEvent(screen.getByLabelText("Use LiteRT model"), "valueChange", false);
    expect(getModelProvider()).toBe("cloud");
  });

  it("only one local model is on at a time", () => {
    render(<ProfileScreen />);
    fireEvent(screen.getByLabelText("Use local model"), "valueChange", true);
    fireEvent(screen.getByLabelText("Use LiteRT model"), "valueChange", true);
    expect(getModelProvider()).toBe("litert");
    expect(screen.getByLabelText("Use local model").props.value).toBe(false);
    expect(screen.getByLabelText("Use LiteRT model").props.value).toBe(true);
    // turning off the switch that is already off changes nothing
    fireEvent(screen.getByLabelText("Use local model"), "valueChange", false);
    expect(getModelProvider()).toBe("litert");
  });
});
