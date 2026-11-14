import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Composer } from "./Composer";

const input = () => screen.getByLabelText("Message");

describe("Composer", () => {
  it("sends what the customer typed with Enter and with the Send button, then clears", () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} />);
    fireEvent.changeText(input(), "  how much on taxis?  ");
    fireEvent(input(), "submitEditing");
    expect(onSend).toHaveBeenLastCalledWith("how much on taxis?");
    expect(input().props.value).toBe("");

    fireEvent.changeText(input(), "and cafés?");
    fireEvent.press(screen.getByLabelText("Send"));
    expect(onSend).toHaveBeenLastCalledWith("and cafés?");
  });

  it("a leftover voice transcript never replaces typed text when voice mode is off", () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} interimTranscript="old spoken question" isConversationMode={false} />);
    fireEvent.changeText(input(), "typed question");
    expect(input().props.value).toBe("typed question");
    fireEvent(input(), "submitEditing");
    expect(onSend).toHaveBeenCalledWith("typed question");
  });

  it("shows the live transcript while voice mode is on", () => {
    render(<Composer onSend={jest.fn()} interimTranscript="hello coach" isConversationMode />);
    expect(input().props.value).toBe("hello coach");
  });

  it("has no extra left icon and no browser focus ring, only a text cursor", () => {
    render(<Composer onSend={jest.fn()} />);
    expect(screen.UNSAFE_queryAllByProps({ name: "message-outline" })).toHaveLength(0);
    expect(StyleSheet.flatten(input().props.style).outlineWidth).toBe(0);
    expect(input().props.cursorColor).toBeTruthy();
  });

  it("does not send while disabled or empty", () => {
    const onSend = jest.fn();
    const { rerender } = render(<Composer onSend={onSend} />);
    fireEvent(input(), "submitEditing");
    rerender(<Composer onSend={onSend} disabled />);
    fireEvent.changeText(input(), "hi");
    fireEvent(input(), "submitEditing");
    expect(onSend).not.toHaveBeenCalled();
  });
});
