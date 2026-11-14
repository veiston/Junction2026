import { fireEvent, render, screen } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import { registry, type WidgetHostApi } from "@/chat/registry";
import type { BasketTrend, Widget, WidgetType } from "@/contracts";
import { mocks as galleryMocks } from "@/dev/mocks";
import { formatCents } from "@/widgets/common/Money";

import { addMonths, changeText, monthLabel } from "./format";
import {
  basketBreakdownMock,
  basketTrendMock,
  mocks,
  peerBenchmarkMock,
  spenderProfileMock,
  spendingSummaryMock,
} from "./mocks";
import { lastMonthIsPartial } from "./widgets/BasketTrendView";

const makeApi = (): WidgetHostApi => ({ request: jest.fn(), sendChat: jest.fn(), formatCents });
const w = (type: WidgetType, data: unknown) => ({ id: `w_${type}`, version: 1, type, data }) as Widget;
const euros = (cents: number) => formatCents(cents);

describe("understand slice registry", () => {
  const owned: WidgetType[] = ["basket_breakdown", "basket_trend", "spending_summary", "spender_profile", "peer_benchmark"];

  it("registers the five widgets it owns, and each has a gallery mock", () => {
    for (const type of owned) {
      expect(registry[type]).toBeDefined();
      expect(galleryMocks[type]).toBe(mocks[type]);
    }
  });

  it.each(owned)("renders %s from its mock without the fallback card", (type) => {
    render(<WidgetHost widget={w(type, mocks[type])} api={makeApi()} />);
    expect(screen.queryByTestId("widget-fallback")).toBeNull();
  });
});

describe("basket_breakdown", () => {
  it("shows the month, the total and the three baskets in order", () => {
    render(<WidgetHost widget={w("basket_breakdown", basketBreakdownMock)} api={makeApi()} />);
    expect(screen.getByText("Your three baskets · Sep 2026 so far")).toBeTruthy();
    expect(screen.getByTestId("breakdown-total").props.children).toBe(euros(154880));
    const labels = screen.getAllByText(/^(Mandatory & regular|Mandatory & irregular|Everyday)$/).map((n) => n.props.children);
    expect(labels).toEqual(["Mandatory & regular", "Mandatory & irregular", "Everyday"]);
  });

  it("asks the coach about a basket when it is tapped", () => {
    const api = makeApi();
    render(<WidgetHost widget={w("basket_breakdown", basketBreakdownMock)} api={api} />);
    fireEvent.press(screen.getByLabelText(/^Everyday:/));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "Tell me more about my everyday spending in Sep 2026" });
  });
});

describe("basket_trend", () => {
  it("draws one column per month and marks the month in progress", () => {
    render(<WidgetHost widget={w("basket_trend", basketTrendMock)} api={makeApi()} />);
    expect(screen.getByTestId("trend-2026-04")).toBeTruthy();
    expect(screen.getByTestId("trend-2026-09")).toBeTruthy();
    expect(screen.getByText("Sep*")).toBeTruthy();
    expect(screen.getByText(/Sep 2026 is still in progress/)).toBeTruthy();
  });

  it("knows when the last month is complete", () => {
    const full: BasketTrend = { ...basketTrendMock, source: { ...basketTrendMock.source, period: { from_date: "2026-04-01", to_date: "2026-09-30" } } };
    expect(lastMonthIsPartial(basketTrendMock)).toBe(true);
    expect(lastMonthIsPartial(full)).toBe(false);
  });
});

describe("spending_summary", () => {
  it("shows the exact amount, the count and the largest purchases", () => {
    render(<WidgetHost widget={w("spending_summary", spendingSummaryMock)} api={makeApi()} />);
    expect(screen.getByTestId("spending-amount").props.children).toBe(euros(8640));
    expect(screen.getByText(/4 purchases/)).toBeTruthy();
    expect(screen.getAllByText("Taxis")).toHaveLength(4);
    expect(screen.getByText(/more than the previous period/)).toBeTruthy();
  });
});

describe("spender_profile", () => {
  it("shows the persona, its traits and tips", () => {
    render(<WidgetHost widget={w("spender_profile", spenderProfileMock)} api={makeApi()} />);
    expect(screen.getByText("The Weekend Socialiser")).toBeTruthy();
    expect(screen.getByText("Weekend spending")).toBeTruthy();
    expect(screen.getByText(/Set a weekend budget/)).toBeTruthy();
  });
});

describe("peer_benchmark", () => {
  it("shows you vs the median, the percentile, the group and the official reference", () => {
    render(<WidgetHost widget={w("peer_benchmark", peerBenchmarkMock)} api={makeApi()} />);
    expect(screen.getByTestId("peer-you").props.children).toBe(euros(31240));
    expect(screen.getByText("You spend more than 38 % of similar customers.")).toBeTruthy();
    expect(screen.getByText(/306 customers/)).toBeTruthy();
    expect(screen.getByText("Statistics Finland 2022")).toBeTruthy();
  });

  it("hides the reference when there is none and handles an empty peer group", () => {
    const data = { ...peerBenchmarkMock, open_data: null, peer_group: { ...peerBenchmarkMock.peer_group, size: 0 } };
    render(<WidgetHost widget={w("peer_benchmark", data)} api={makeApi()} />);
    expect(screen.queryByText(/Statistics Finland/)).toBeNull();
    expect(screen.getByText("There are no similar customers to compare with yet.")).toBeTruthy();
  });
});

describe("format helpers", () => {
  it("formats months and changes", () => {
    expect(monthLabel("2026-01")).toBe("Jan 2026");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2025-12", 1)).toBe("2026-01");
    expect(changeText(null)).toBe("new this month");
    expect(changeText(-4)).toContain("−4");
  });
});
