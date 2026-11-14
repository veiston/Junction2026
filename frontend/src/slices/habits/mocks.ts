import type {
  ChallengeProgress,
  ChallengeSuggestions,
  LimitProgress,
  LimitReview,
  LimitSuggestion,
  Source,
  SpendingLimit,
} from "@/contracts";

const source = (description: string, from: string, to: string, count: number): Source => ({
  description,
  period: { from_date: from, to_date: to },
  tx_count: count,
});

const limit = (month: string, cents: number): SpendingLimit => ({
  id: 1,
  month,
  basket: "everyday",
  amount_cents: cents,
  status: "active",
  created_at: `${month}-01T08:00:00Z`,
});

export const limitSuggestionMock: LimitSuggestion = {
  month: "2026-09",
  basket: "everyday",
  suggested_cents: 52000,
  min_cents: 20000,
  max_cents: 80000,
  step_cents: 1000,
  history: [
    { month: "2026-06", amount_cents: 61200 },
    { month: "2026-07", amount_cents: 58400 },
    { month: "2026-08", amount_cents: 60400 },
  ],
  expected_saving_cents: 8000,
  rationale: "Slightly below your 3-month average of everyday spending.",
  source: source("Everyday spending, last 3 full months", "2026-06-01", "2026-08-31", 212),
};

export const limitProgressMock: LimitProgress = {
  limit: limit("2026-09", 52000),
  spent_cents: 27400,
  remaining_cents: 24600,
  days_elapsed: 15,
  days_in_month: 30,
  on_pace_cents: 26000,
  status: "at_risk",
  daily: [
    { date: "2026-09-01", cumulative_cents: 1800 },
    { date: "2026-09-08", cumulative_cents: 14200 },
    { date: "2026-09-15", cumulative_cents: 27400 },
  ],
  top_groups: [
    { spend_group: "supermarkets", label: "Supermarkets", amount_cents: 12400, tx_count: 14 },
    { spend_group: "taxis", label: "Taxis", amount_cents: 6100, tx_count: 4 },
  ],
  source: source("Everyday spending this month", "2026-09-01", "2026-09-15", 41),
};

export const limitReviewMock: LimitReview = {
  limit: { ...limit("2026-09", 52000), status: "completed" },
  final_spent_cents: 47600,
  difference_cents: 4400,
  met: true,
  previous_month_cents: 60400,
  biggest_leak: { spend_group: "taxis", label: "Taxis", amount_cents: 9200, tx_count: 6 },
  best_week_start: "2026-09-08",
  source: source("Everyday spending in September", "2026-09-01", "2026-09-30", 83),
};

export const challengeSuggestionsMock: ChallengeSuggestions = {
  items: [
    {
      id: "no_taxi_week",
      title: "Taxi-free week",
      description: "Skip taxis for 7 days and use public transport instead.",
      spend_group: "taxis",
      rule: { kind: "zero_spend" },
      duration_days: 7,
      estimated_saving_cents: 3500,
      reason: "You took 9 taxis last month.",
    },
    {
      id: "cafe_cap",
      title: "Cafe cap",
      description: "Keep cafe spending under 20 EUR for two weeks.",
      spend_group: "fast_food_cafes",
      rule: { kind: "max_amount", amount_cents: 2000 },
      duration_days: 14,
      estimated_saving_cents: 4200,
      reason: "You spent 62 EUR in cafes last month.",
    },
    {
      id: "fast_food_limit",
      title: "Fewer takeaways",
      description: "At most 2 fast food purchases in 30 days.",
      spend_group: "fast_food_cafes",
      rule: { kind: "max_count", count: 2 },
      duration_days: 30,
      estimated_saving_cents: 6800,
      reason: "You bought takeaway 8 times last month.",
    },
  ],
};

export const challengeProgressMock: ChallengeProgress = {
  challenge: {
    id: 1,
    template_id: "no_taxi_week",
    title: "Taxi-free week",
    spend_group: "taxis",
    rule: { kind: "zero_spend" },
    start_date: "2026-09-10",
    end_date: "2026-09-16",
    status: "active",
  },
  progress_pct: 57.1,
  current_amount_cents: 0,
  current_count: 0,
  days_left: 3,
  on_track: true,
  source: source("Taxi spending since the challenge started", "2026-09-10", "2026-09-14", 0),
};

export const habitsMocks = {
  limit_suggestion: limitSuggestionMock,
  limit_progress: limitProgressMock,
  limit_review: limitReviewMock,
  challenge_suggestions: challengeSuggestionsMock,
  challenge_progress: challengeProgressMock,
};
