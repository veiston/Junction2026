import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import type { WidgetHostApi } from "@/chat/registry";
import type { BasketBreakdown, TransactionPage, Widget, WidgetType } from "@/contracts";
import { formatCents } from "@/widgets/common/Money";

import { basketBreakdownMock, basketTrendMock, spendingSummaryMock } from "../mocks";
import { spendingFilterQuery } from "./hooks";

const w = (type: WidgetType, data: unknown) => ({ id: `w_${type}`, version: 1, type, data }) as Widget;

function apiWith(answer: (path: string) => unknown) {
  const request = jest.fn((_method: string, path: string) => Promise.resolve(answer(path)));
  const api = { request, sendChat: jest.fn(), formatCents } as unknown as WidgetHostApi;
  return { api, request };
}

const august: BasketBreakdown = { ...basketBreakdownMock, month: "2026-08", is_partial_month: false };

describe("basket_breakdown month switch", () => {
  it("loads the previous month through the host API and re-renders", async () => {
    const { api, request } = apiWith(() => august);
    render(<WidgetHost widget={w("basket_breakdown", basketBreakdownMock)} api={api} />);
    expect(screen.getByLabelText("Next month")).toBeDisabled(); // the month of today is the last one

    fireEvent.press(screen.getByLabelText("Previous month"));
    expect(request).toHaveBeenCalledWith("GET", "/understand/baskets?month=2026-08");
    await waitFor(() => expect(screen.getByText("Your three baskets · Aug 2026")).toBeTruthy());
    expect(screen.getByLabelText("Next month")).not.toBeDisabled();
  });

  it("cannot go before the first month of the data", () => {
    const { api } = apiWith(() => null);
    render(<WidgetHost widget={w("basket_breakdown", { ...august, month: "2024-10" })} api={api} />);
    expect(screen.getByLabelText("Previous month")).toBeDisabled();
  });

  it("shows a friendly error and keeps the old data when the call fails", async () => {
    const request = jest.fn(() => Promise.reject(new Error("offline")));
    const api = { request, sendChat: jest.fn(), formatCents } as unknown as WidgetHostApi;
    render(<WidgetHost widget={w("basket_breakdown", basketBreakdownMock)} api={api} />);
    fireEvent.press(screen.getByLabelText("Previous month"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("Your three baskets · Sep 2026 so far")).toBeTruthy();
  });
});

describe("basket_trend range selector", () => {
  it("re-calls GET /understand/trend with the chosen number of months", async () => {
    const three = { ...basketTrendMock, months: basketTrendMock.months.slice(-3) };
    const { api, request } = apiWith(() => three);
    render(<WidgetHost widget={w("basket_trend", basketTrendMock)} api={api} />);
    expect(screen.getByLabelText("6 months")).toBeSelected();

    fireEvent.press(screen.getByLabelText("3 months"));
    expect(request).toHaveBeenCalledWith("GET", "/understand/trend?months=3");
    await act(async () => {
      await Promise.resolve(); // let the mocked request resolve
    });
    expect(screen.queryAllByTestId(/^trend-/).map((n) => n.props.testID)).toEqual([
      "trend-2026-07",
      "trend-2026-08",
      "trend-2026-09",
    ]);
    expect(screen.getByLabelText("3 months")).toBeSelected();
  });
});

describe("spending_summary See all", () => {
  const page = (n: number): TransactionPage => ({
    items: spendingSummaryMock.sample_transactions.map((t) => ({ ...t, id: t.id + n * 100 })),
    page: n,
    page_size: 20,
    total: 27,
    total_amount_cents: -50000,
  });

  it("builds the transactions filter from the summary query", () => {
    expect(spendingFilterQuery(spendingSummaryMock, 2)).toBe(
      "from_date=2026-08-01&to_date=2026-08-31&flow=spending&spend_group=taxis&page=2&page_size=20",
    );
  });

  it("expands the full list and pages through it", async () => {
    const { api, request } = apiWith((path) => page(Number(/page=(\d+)/.exec(path)?.[1])));
    render(<WidgetHost widget={w("spending_summary", spendingSummaryMock)} api={api} />);
    expect(request).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("See all (7)"));
    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeTruthy());
    expect(request).toHaveBeenLastCalledWith("GET", `/transactions?${spendingFilterQuery(spendingSummaryMock, 1)}`);

    fireEvent.press(screen.getByLabelText("Next page"));
    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeTruthy());

    fireEvent.press(screen.getByText("Hide the list"));
    expect(screen.queryByTestId("see-all-list")).toBeNull();
  });

  it("has no See all when every purchase is already shown", async () => {
    const { api } = apiWith(() => null);
    const all = { ...spendingSummaryMock, tx_count: spendingSummaryMock.sample_transactions.length };
    render(<WidgetHost widget={w("spending_summary", all)} api={api} />);
    await act(async () => {});
    expect(screen.queryByText(/See all/)).toBeNull();
  });
});
