import type { BalanceForecast, WhatIfResult } from "@/contracts";
import { formatCents } from "@/widgets/common/Money";

import { shortDate } from "./BalanceChart";
import type { Lesson } from "./QuickLesson";

const THREE_BASKETS =
  "Money falls into three baskets: mandatory and regular (rent, bills), mandatory and irregular " +
  "(a broken washing machine) and everyday spending that slips through your fingers (coffees, takeaways).";

/** "Why does the balance drop?" about the customer's first predicted bill; null when none is due. */
export function forecastLesson(data: BalanceForecast): Lesson | null {
  const bill = data.upcoming_bills[0];
  if (!bill) {
    return null;
  }
  return {
    question: `Why does your balance drop on ${shortDate(bill.due_date)}?`,
    options: ["Everyday spending", bill.label, "Your salary"],
    answer: 1,
    explanation:
      `${bill.label} (${formatCents(bill.amount_cents)}) is mandatory and regular: it comes every month, ` +
      "so you can plan for it instead of being surprised.",
  };
}

export const SAFE_TO_SPEND_LESSON: Lesson = {
  question: "What is set aside before your safe-to-spend?",
  options: ["Coffees and takeaways", "Rent, bills and a buffer for surprises", "Nothing"],
  answer: 1,
  explanation: `${THREE_BASKETS} Safe-to-spend keeps the first two safe, so what is left is free for the third.`,
};

export function whatIfLesson(data: WhatIfResult): Lesson {
  return {
    question: "Which basket is usually the easiest to cut?",
    options: ["Rent and bills", "Surprise repairs", "Everyday spending"],
    answer: 2,
    explanation:
      `${THREE_BASKETS} Small everyday buys add up: this change is worth ` +
      `${formatCents(data.yearly_saving_cents)} a year.`,
  };
}
