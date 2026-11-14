import type {
  BasketBreakdown,
  BasketTrend,
  PeerBenchmark,
  SpenderProfile,
  SpendingSummary,
  Transaction,
  WidgetType,
} from "@/contracts";

const source = (from_date: string, to_date: string, tx_count: number, description = "Calculated from your transactions") => ({
  description,
  period: { from_date, to_date },
  tx_count,
});

export const basketBreakdownMock: BasketBreakdown = {
  month: "2026-09",
  is_partial_month: true,
  total_spending_cents: 154880,
  income_cents: 320000,
  saving_cents: 0,
  baskets: [
    {
      basket: "mandatory_regular",
      amount_cents: 122630,
      share_pct: 79.2,
      tx_count: 5,
      previous_amount_cents: 115230,
      change_pct: 6.4,
      top_groups: [
        { spend_group: "housing", label: "Rent / housing", amount_cents: 95000, tx_count: 1 },
        { spend_group: "supermarkets", label: "Supermarkets", amount_cents: 12830, tx_count: 2 },
        { spend_group: "utilities", label: "Utilities", amount_cents: 8700, tx_count: 1 },
      ],
    },
    {
      basket: "mandatory_irregular",
      amount_cents: 20900,
      share_pct: 13.5,
      tx_count: 2,
      previous_amount_cents: 2390,
      change_pct: 774.5,
      top_groups: [
        { spend_group: "dentists", label: "Dentists", amount_cents: 12000, tx_count: 1 },
        { spend_group: "electronics", label: "Electronics", amount_cents: 8900, tx_count: 1 },
      ],
    },
    {
      basket: "everyday",
      amount_cents: 11350,
      share_pct: 7.3,
      tx_count: 5,
      previous_amount_cents: 5150,
      change_pct: 120.4,
      top_groups: [
        { spend_group: "events_tickets", label: "Events & tickets", amount_cents: 4500, tx_count: 1 },
        { spend_group: "bars", label: "Bars", amount_cents: 2800, tx_count: 1 },
        { spend_group: "fast_food_cafes", label: "Fast food & cafés", amount_cents: 2100, tx_count: 2 },
      ],
    },
  ],
  source: source("2026-09-01", "2026-09-15", 12),
};

const trendMonth = (month: string, regular: number, irregular: number, everyday: number) => {
  const total = regular + irregular + everyday;
  const share = (v: number) => Math.round((v / total) * 1000) / 10;
  return {
    month,
    baskets: [
      { basket: "mandatory_regular" as const, amount_cents: regular, share_pct: share(regular), tx_count: 12 },
      { basket: "mandatory_irregular" as const, amount_cents: irregular, share_pct: share(irregular), tx_count: 2 },
      { basket: "everyday" as const, amount_cents: everyday, share_pct: share(everyday), tx_count: 18 },
    ],
  };
};

export const basketTrendMock: BasketTrend = {
  months: [
    trendMonth("2026-04", 141000, 4200, 38000),
    trendMonth("2026-05", 139500, 12900, 42500),
    trendMonth("2026-06", 142300, 3100, 47800),
    trendMonth("2026-07", 140800, 6400, 51200),
    trendMonth("2026-08", 143900, 6980, 49300),
    trendMonth("2026-09", 122630, 20900, 11350),
  ],
  source: source("2026-04-01", "2026-09-15", 190),
};

const tx = (id: number, date: string, label: string, cents: number): Transaction =>
  ({
    id,
    date,
    timestamp: `${date}T18:30:00Z`,
    category: "Transportation",
    spend_group: "taxis",
    label,
    amount_cents: cents,
    balance_after_cents: 100000,
    flow: "spending",
    basket: "everyday",
    merchant_id: null,
    mcc: "4121",
  }) as Transaction;

export const spendingSummaryMock: SpendingSummary = {
  query: { spend_group: "taxis", from_date: "2026-08-01", to_date: "2026-08-31" },
  label: "Taxis",
  amount_cents: 12480,
  tx_count: 7,
  average_tx_cents: 1783,
  previous_period_amount_cents: 5210,
  sample_transactions: [
    tx(1, "2026-08-23", "Taxis", -3120),
    tx(2, "2026-08-09", "Taxis", -2100),
    tx(3, "2026-08-16", "Taxis", -1840),
    tx(4, "2026-08-02", "Taxis", -1580),
  ],
  source: source("2026-08-01", "2026-08-31", 7),
};

export const spenderProfileMock: SpenderProfile = {
  persona: "weekend_socialiser",
  title: "The Weekend Socialiser",
  description:
    "Most of your everyday spending happens from Friday to Sunday. Your weekdays are calm and your weekends are where life happens.",
  traits: [
    {
      key: "weekend_share",
      label: "Weekend spending",
      value_text: "61 % of everyday spending happens Fri-Sun",
      evidence: "Fri-Sun is 3 of 7 days (about 43 %), so a higher share means the weekend carries more.",
    },
    {
      key: "late_night_share",
      label: "Late-night spending",
      value_text: "18 % of everyday spending happens 21:00-04:59",
      evidence: "Counted from the time of each everyday purchase.",
    },
    {
      key: "micro_spend",
      label: "Small purchases",
      value_text: "64 € a month in purchases under 15 € (11 a month)",
      evidence: "Everyday purchases under 15 €, averaged over the last 3 months.",
    },
  ],
  metrics: {
    weekend_share_pct: 61,
    late_night_share_pct: 18,
    post_payday_share_pct: 12.4,
    micro_spend_monthly_cents: 6400,
    everyday_share_pct: 31.5,
  },
  tips: [
    "Set a weekend budget on Friday morning and check it on Sunday.",
    "Alternate one paid outing with one free plan each weekend.",
    "Small purchases under 15 € add up to about 768 € a year.",
  ],
  source: source("2026-06-18", "2026-09-15", 87, "Calculated from your everyday spending of the last 90 days"),
};

export const peerBenchmarkMock: PeerBenchmark = {
  scope: "category",
  key: "Groceries",
  label: "Groceries",
  your_monthly_cents: 31240,
  your_share_of_spending_pct: 15.8,
  peer_median_monthly_cents: 36800,
  peer_p25_monthly_cents: 24500,
  peer_p75_monthly_cents: 51200,
  your_percentile: 38,
  peer_group: { age_band: "25-34", region: "Helsinki", size: 306 },
  open_data: {
    label: "Helsinki-Uusimaa households, food and non-alcoholic beverages",
    share_of_spending_pct: 12.6,
    year: 2022,
    source_url: "https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__ktutk/statfin_ktutk_pxt_14q8.px",
  },
  source: source("2026-06-01", "2026-08-31", 41, "Your last 3 full months compared with similar customers"),
};

/** Gallery mocks for the widget types this slice owns. */
export const mocks: Partial<Record<WidgetType, unknown>> = {
  basket_breakdown: basketBreakdownMock,
  basket_trend: basketTrendMock,
  spending_summary: spendingSummaryMock,
  spender_profile: spenderProfileMock,
  peer_benchmark: peerBenchmarkMock,
};
