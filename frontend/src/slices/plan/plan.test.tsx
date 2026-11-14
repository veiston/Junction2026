import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { WidgetHostApi } from "@/chat/registry";
import type { Widget } from "@/contracts";
import {
  balanceForecastMock,
  expenseAlertsMock,
  safeToSpendMock,
  upcomingBillsMock,
  whatIfMock,
} from "@/dev/mocks";
import { WidgetHost } from "@/chat/WidgetHost";
import { formatCents } from "@/widgets/common/Money";

const api: WidgetHostApi = { request: jest.fn(), sendChat: jest.fn(), formatCents };
const request = api.request as jest.Mock;

const renderWidget = (type: Widget["type"], data: unknown) =>
  render(<WidgetHost widget={{ id: "w1", version: 1, type, data } as Widget} api={api} />);

beforeEach(() => {
  request.mockReset();
});

describe("balance_forecast", () => {
  it("shows end and lowest balance", () => {
    renderWidget("balance_forecast", balanceForecastMock);
    expect(screen.getByText(formatCents(balanceForecastMock.end_balance_cents))).toBeTruthy();
    expect(screen.getByText(formatCents(balanceForecastMock.lowest_balance_cents))).toBeTruthy();
  });

  it("explains the dips and jumps: every bill and payday plus the daily spending", () => {
    renderWidget("balance_forecast", balanceForecastMock);
    const [bill] = balanceForecastMock.upcoming_bills;
    expect(screen.getByText(formatCents(-bill.amount_cents))).toBeTruthy();
    expect(screen.getByText("5.10. Salary")).toBeTruthy();
    expect(screen.getByText(/about 60,00 € a day/)).toBeTruthy();
  });

  it("re-calls the forecast endpoint when another horizon is picked", async () => {
    request.mockResolvedValue({ ...balanceForecastMock, horizon_days: 60 });
    renderWidget("balance_forecast", balanceForecastMock);
    fireEvent.press(screen.getByText("60 days"));
    await waitFor(() => expect(request).toHaveBeenCalledWith("GET", "/plan/forecast?horizon_days=60"));
  });

  it("shows a message when the refresh fails", async () => {
    request.mockRejectedValue(new Error("offline"));
    renderWidget("balance_forecast", balanceForecastMock);
    fireEvent.press(screen.getByText("90 days"));
    expect(await screen.findByText("Could not update. Please try again.")).toBeTruthy();
  });
});

describe("upcoming_bills", () => {
  it("lists the bills with their total", () => {
    renderWidget("upcoming_bills", upcomingBillsMock);
    expect(screen.getByText("Rent / housing")).toBeTruthy();
    expect(screen.getByText(formatCents(upcomingBillsMock.total_cents))).toBeTruthy();
  });

  it("shows a positive message when there are no bills", () => {
    renderWidget("upcoming_bills", { ...upcomingBillsMock, bills: [], total_cents: 0 });
    expect(screen.getByText(/No bills expected/)).toBeTruthy();
  });
});

describe("expense_alerts", () => {
  it("lists each alert with its reason", () => {
    renderWidget("expense_alerts", expenseAlertsMock);
    expect(screen.getByText(expenseAlertsMock.alerts[0].reason)).toBeTruthy();
    expect(screen.getByText(formatCents(expenseAlertsMock.alerts[0].transaction.amount_cents))).toBeTruthy();
  });

  it("shows a positive message when there are no alerts", () => {
    renderWidget("expense_alerts", { ...expenseAlertsMock, alerts: [] });
    expect(screen.getByText(/No unusually big expenses/)).toBeTruthy();
  });
});

describe("safe_to_spend", () => {
  it("shows per day, this week and until payday", () => {
    renderWidget("safe_to_spend", safeToSpendMock);
    expect(screen.getByText(formatCents(safeToSpendMock.safe_per_day_cents))).toBeTruthy();
    expect(screen.getByText(formatCents(safeToSpendMock.safe_this_week_cents))).toBeTruthy();
    expect(screen.getByText(formatCents(safeToSpendMock.safe_total_cents))).toBeTruthy();
    expect(screen.getByText("Payday 2026-09-25 · 10 days")).toBeTruthy();
  });

  it("shows the status and every calculation step", () => {
    renderWidget("safe_to_spend", safeToSpendMock);
    expect(screen.getByText("Comfortable")).toBeTruthy();
    safeToSpendMock.steps.forEach((step) => expect(screen.getByText(step.label)).toBeTruthy());
  });

  it("has steps that add up to the safe total", () => {
    const sum = safeToSpendMock.steps.reduce((total, step) => total + step.amount_cents, 0);
    expect(sum).toBe(safeToSpendMock.safe_total_cents);
  });
});

describe("what_if", () => {
  const requestWith = (changePct: number) => ({
    ...whatIfMock.request,
    adjustments: [{ ...whatIfMock.request.adjustments[0], change_pct: changePct }],
  });

  it("shows monthly and yearly saving and months to goal", () => {
    renderWidget("what_if", whatIfMock);
    expect(screen.getByText(formatCents(whatIfMock.monthly_saving_cents))).toBeTruthy();
    expect(screen.getByText(formatCents(whatIfMock.yearly_saving_cents))).toBeTruthy();
    expect(screen.getByText("With the change: 6 months")).toBeTruthy();
  });

  it("hides months to goal when there is no goal", () => {
    renderWidget("what_if", { ...whatIfMock, goal: null });
    expect(screen.queryByText(/Months to reach/)).toBeNull();
  });

  it("asks for 5 % more when + is pressed", async () => {
    request.mockResolvedValue(whatIfMock);
    renderWidget("what_if", whatIfMock);
    fireEvent.press(screen.getByLabelText("Increase change by 5 %"));
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST", "/plan/what-if", requestWith(-15)));
  });

  it("asks for 5 % less when − is pressed", async () => {
    request.mockResolvedValue(whatIfMock);
    renderWidget("what_if", whatIfMock);
    fireEvent.press(screen.getByLabelText("Decrease change by 5 %"));
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST", "/plan/what-if", requestWith(-25)));
  });
});
