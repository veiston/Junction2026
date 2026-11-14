import type {
  BalanceForecast,
  Bill,
  Category,
  Confidence,
  ExpenseAlerts,
  SafeToSpend,
  Source,
  SpendGroup,
  Transaction,
  TransactionListData,
  TrendPoint,
  UpcomingBills,
  WhatIfResult,
  WidgetType,
} from "@/contracts";
import { challengeProgressLostMock, challengeProgressWonMock, habitsMocks } from "@/slices/habits/mocks";
import { conceptMocks } from "@/widgets/common/conceptMocks";

const tx = (id: number, date: string, label: string, cents: number): Transaction => ({
  id,
  date,
  timestamp: `${date}T09:00:00Z`,
  category: "Transportation",
  spend_group: "taxis",
  label,
  amount_cents: cents,
  balance_after_cents: 100000,
  flow: cents < 0 ? "spending" : "income",
  basket: cents < 0 ? "everyday" : null,
  merchant_id: null,
  mcc: null,
} as Transaction);

export const transactionListMock: TransactionListData = {
  title: "Latest transactions",
  filter: { from_date: "2026-09-01", to_date: "2026-09-15" },
  page: {
    items: [
      tx(1, "2026-09-14", "Taxis", -1840),
      tx(2, "2026-09-13", "Supermarkets", -5620),
      tx(3, "2026-09-12", "Salary", 245000),
      tx(4, "2026-09-10", "Rent / housing", -89000),
      tx(5, "2026-09-09", "Cafés", -480),
    ],
    page: 1,
    page_size: 5,
    total: 23,
    total_amount_cents: -312450,
  },
};

const planSource: Source = {
  description: "Your transactions",
  period: { from_date: "2025-09-15", to_date: "2026-09-15" },
  tx_count: 412,
};

const FORECAST_START = "2026-09-15";
const FORECAST_START_CENTS = 180000;
const FORECAST_DAILY_SPEND_CENTS = 6000;
const FORECAST_SALARY_DAY = 20;
const FORECAST_SALARY_CENTS = 245000;
const WHAT_IF_MONTHLY_SAVING_CENTS = 4400;
const DAYS_IN_MONTH = 30;

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const baselineBalance = (day: number): number => {
  const balance = FORECAST_START_CENTS - FORECAST_DAILY_SPEND_CENTS * day;
  if (day >= FORECAST_SALARY_DAY) {
    return balance + FORECAST_SALARY_CENTS;
  }
  return balance;
};

const adjustedBalance = (day: number): number =>
  baselineBalance(day) + Math.round((WHAT_IF_MONTHLY_SAVING_CENTS * day) / DAYS_IN_MONTH);

const trend = (days: number, balanceAt: (day: number) => number): TrendPoint[] =>
  Array.from({ length: days + 1 }, (_, day) => ({ date: addDays(FORECAST_START, day), balance_cents: balanceAt(day) }));

const bill = (
  label: string,
  category: Category,
  spendGroup: SpendGroup,
  dueDate: string,
  cents: number,
  confidence: Confidence,
): Bill => ({
  label,
  category,
  spend_group: spendGroup,
  basket: "mandatory_regular",
  due_date: dueDate,
  amount_cents: cents,
  confidence,
});

const upcomingBills: Bill[] = [
  bill("Phone", "Utilities", "utilities", "2026-09-22", 2990, "high"),
  bill("Electricity", "Utilities", "utilities", "2026-09-28", 6400, "medium"),
  bill("Rent / housing", "Housing", "housing", "2026-10-01", 89000, "high"),
];

export const balanceForecastMock: BalanceForecast = {
  horizon_days: 30,
  start_date: FORECAST_START,
  start_balance_cents: FORECAST_START_CENTS,
  end_balance_cents: baselineBalance(30),
  lowest_balance_cents: baselineBalance(19),
  lowest_balance_date: "2026-10-04",
  points: trend(30, baselineBalance),
  upcoming_bills: upcomingBills,
  expected_income: [{ label: "Salary", date: "2026-10-05", amount_cents: 245000, confidence: "high" }],
  essentials_daily_cents: 3500,
  everyday_daily_cents: 1500,
  irregular_daily_cents: 1000,
  method: "We repeat your usual bills and daily spending of the last 3 months and add your expected salary.",
  source: planSource,
};

export const upcomingBillsMock: UpcomingBills = {
  horizon_days: 30,
  bills: upcomingBills,
  total_cents: 98390,
};

export const expenseAlertsMock: ExpenseAlerts = {
  period: { from_date: "2026-08-16", to_date: "2026-09-15" },
  alerts: [
    {
      transaction: tx(11, "2026-09-11", "Taxis", -12400),
      reason: "6.2 times your usual taxi ride",
      typical_amount_cents: 2000,
      ratio: 6.2,
      severity: "warning",
    },
    {
      transaction: tx(12, "2026-09-03", "Cafés", -4500),
      reason: "3.0 times your usual café visit",
      typical_amount_cents: 1500,
      ratio: 3,
      severity: "info",
    },
  ],
};

export const safeToSpendMock: SafeToSpend = {
  today: "2026-09-15",
  next_payday: "2026-09-25",
  days_until_payday: 10,
  balance_cents: 180000,
  upcoming_bills_cents: 62000,
  essentials_cents: 35000,
  irregular_buffer_cents: 10000,
  safe_total_cents: 73000,
  safe_per_day_cents: 7300,
  safe_this_week_cents: 51100,
  status: "comfortable",
  steps: [
    { label: "Balance today", amount_cents: 180000 },
    { label: "Upcoming bills", amount_cents: -62000 },
    { label: "Groceries, fuel and commute", amount_cents: -35000 },
    { label: "Buffer for irregular costs", amount_cents: -10000 },
  ],
  source: planSource,
};

export const whatIfMock: WhatIfResult = {
  request: {
    adjustments: [{ target_type: "spend_group", target: "restaurants", change_pct: -20 }],
    horizon_days: 30,
    goal_cents: 300000,
  },
  lines: [
    {
      target_type: "spend_group",
      target: "restaurants",
      label: "Restaurants",
      baseline_monthly_cents: 22000,
      adjusted_monthly_cents: 17600,
    },
  ],
  monthly_saving_cents: WHAT_IF_MONTHLY_SAVING_CENTS,
  yearly_saving_cents: 52800,
  baseline_end_balance_cents: baselineBalance(30),
  adjusted_end_balance_cents: adjustedBalance(30),
  baseline_points: trend(30, baselineBalance),
  adjusted_points: trend(30, adjustedBalance),
  goal: { goal_cents: 300000, months_to_goal_baseline: 8, months_to_goal_adjusted: 6 },
  source: planSource,
};

/** One mock per widget type that has a component. Slices add theirs here. */
export const mocks: Partial<Record<WidgetType, unknown>> = {
  transaction_list: transactionListMock,
  balance_forecast: balanceForecastMock,
  upcoming_bills: upcomingBillsMock,
  expense_alerts: expenseAlertsMock,
  safe_to_spend: safeToSpendMock,
  what_if: whatIfMock,
  concept_note: conceptMocks.small_purchases_add_up,
  ...habitsMocks,
};

/** Extra gallery entries: further states of a widget type, shown after the main list. */
export const mockVariants: { name: string; type: WidgetType; data: unknown }[] = [
  { name: "challenge_progress (won)", type: "challenge_progress", data: challengeProgressWonMock },
  { name: "challenge_progress (lost, spent more)", type: "challenge_progress", data: challengeProgressLostMock },
  ...Object.values(conceptMocks).map((n) => ({ name: `concept_note (${n.id})`, type: "concept_note" as WidgetType, data: n })),
];
