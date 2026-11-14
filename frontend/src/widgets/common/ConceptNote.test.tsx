import { render, screen } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import { registry, type WidgetHostApi } from "@/chat/registry";
import type { Widget } from "@/contracts";
import { formatCents } from "@/widgets/common/Money";

import { conceptMocks } from "./conceptMocks";

const api: WidgetHostApi = { request: jest.fn(), sendChat: jest.fn(), formatCents };

describe("concept_note", () => {
  it("is registered", () => {
    expect(registry.concept_note).toBeDefined();
  });

  it.each(Object.values(conceptMocks))("renders $id", (note) => {
    render(<WidgetHost widget={{ id: "c", version: 1, type: "concept_note", data: note } as Widget} api={api} />);
    expect(screen.getByText("Learn")).toBeTruthy();
    expect(screen.getByText(note.title)).toBeTruthy();
    expect(screen.getByText(note.text)).toBeTruthy();
  });

  it("does not crash without data", () => {
    expect(() =>
      render(<WidgetHost widget={{ id: "c", version: 1, type: "concept_note", data: undefined } as unknown as Widget} api={api} />),
    ).not.toThrow();
  });
});
