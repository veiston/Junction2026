import { conceptMocks } from "@/widgets/common/conceptMocks";
import type {
  Challenge,
  ChallengeProgress,
  ChallengeSuggestions,
  ChallengeTemplate,
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

const taxiTemplate = {
  id: "taxi_half_week",
  title: "Halve your taxi spending for 7 days",
  description: "Take public transport or walk for some trips this week.",
  spend_group: "taxis",
  rule: { kind: "max_amount", amount_cents: 4900 },
  duration_days: 7,
  estimated_saving_cents: 5026,
  reason: "You took 3 taxi rides for 99,26 EUR in the last 7 days.",
  baseline_cents: 9926,
  baseline_count: 3,
  yearly_saving_cents: 261352,
  concept: conceptMocks.small_purchases_add_up,
} as ChallengeTemplate;

export const challengeSuggestionsMock: ChallengeSuggestions = {
  items: [
    taxiTemplate,
    // Older shape: none of the 1.1.0 fields.
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
  ],
};

const taxiChallenge = {
  id: 1,
  template_id: "taxi_half_week",
  title: "Halve your taxi spending for 7 days",
  spend_group: "taxis",
  rule: { kind: "max_amount", amount_cents: 4900 },
  start_date: "2026-09-10",
  end_date: "2026-09-16",
  status: "active",
} as Challenge;

/** Experiment in progress. */
export const challengeProgressMock: ChallengeProgress = {
  challenge: taxiChallenge,
  progress_pct: 57.1,
  current_amount_cents: 2150,
  current_count: 1,
  days_left: 3,
  on_track: true,
  baseline_cents: 9926,
  baseline_count: 3,
  concept: conceptMocks.small_purchases_add_up,
  source: source("Taxi spending since the experiment started", "2026-09-10", "2026-09-13", 1),
};

/** Finished, target met: EUR 38.81 against a baseline of EUR 99.26. */
export const challengeProgressWonMock: ChallengeProgress = {
  challenge: { ...taxiChallenge, status: "won" },
  progress_pct: 100,
  current_amount_cents: 3881,
  current_count: 1,
  days_left: 0,
  on_track: true,
  baseline_cents: 9926,
  baseline_count: 3,
  difference_cents: 6045,
  change_pct: 60.9,
  concept: conceptMocks.one_week_is_not_proof,
  next_step: "Repeat the experiment for another 7 days to see if the change holds, or test a different category.",
  source: source("Taxi spending during the experiment", "2026-09-10", "2026-09-16", 1),
};

/** Finished, target not met: spent more than before. */
export const challengeProgressLostMock: ChallengeProgress = {
  challenge: { ...taxiChallenge, status: "lost" },
  progress_pct: 100,
  current_amount_cents: 12400,
  current_count: 4,
  days_left: 0,
  on_track: false,
  baseline_cents: 9926,
  baseline_count: 3,
  difference_cents: -2474,
  change_pct: -24.9,
  concept: conceptMocks.compare_equal_periods,
  next_step: "This week was higher than the week before. Try again for 7 days, or pick another category.",
  source: source("Taxi spending during the experiment", "2026-09-10", "2026-09-16", 4),
};

export const habitsMocks = {
  limit_suggestion: limitSuggestionMock,
  limit_progress: limitProgressMock,
  limit_review: limitReviewMock,
  challenge_suggestions: challengeSuggestionsMock,
  challenge_progress: challengeProgressMock,
};
