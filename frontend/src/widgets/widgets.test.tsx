import { fireEvent, render, screen } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import type { WidgetHostApi } from "@/chat/registry";
import type { Widget } from "@/contracts";
import { transactionListMock } from "@/dev/mocks";

import { formatCents } from "./common/Money";

const api: WidgetHostApi = { request: jest.fn(), sendChat: jest.fn(), formatCents };
const txWidget = { id: "w1", version: 1, type: "transaction_list", data: transactionListMock } as Widget;

describe("WidgetHost", () => {
  it("renders a transaction_list with rows and a See all button", () => {
    render(<WidgetHost widget={txWidget} api={api} />);
    expect(screen.getByText("Latest transactions")).toBeTruthy();
    expect(screen.getByText("Taxis")).toBeTruthy();
    expect(screen.getByText("See all (23)")).toBeTruthy();
  });

  it("calls onSeeAll with the widget data", () => {
    const onSeeAll = jest.fn();
    render(<WidgetHost widget={txWidget} api={api} onSeeAll={onSeeAll} />);
    fireEvent.press(screen.getByText("See all (23)"));
    expect(onSeeAll).toHaveBeenCalledWith(transactionListMock);
  });

  it("hides See all when every row is already shown", () => {
    const all = { ...transactionListMock, page: { ...transactionListMock.page, total: 5 } };
    render(<WidgetHost widget={{ ...txWidget, data: all } as Widget} api={api} />);
    expect(screen.queryByText(/See all/)).toBeNull();
  });

  it("shows a neutral fallback for a type with no component, never a crash", () => {
    render(<WidgetHost widget={{ id: "w2", version: 1, type: "what_if", data: {} } as Widget} api={api} />);
    expect(screen.getByTestId("widget-fallback")).toBeTruthy();
  });
});

describe("formatCents", () => {
  it("formats integer cents as euros", () => {
    expect(formatCents(123456).replace(/\s/g, " ")).toContain("1");
    expect(formatCents(-1840)).toContain("18,40");
  });
});
