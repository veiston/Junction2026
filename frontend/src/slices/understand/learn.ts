import type { BasketBreakdown, BasketTrend, PeerBenchmark, SpenderProfile, SpendingSummary } from "@/contracts";

import { monthShort } from "./format";
import { lastMonthIsPartial } from "./widgets/BasketTrendView";

/** A follow-up the customer can tap; `message` is sent to the coach as if typed. */
export interface NextStep {
  label: string;
  message: string;
}

export interface Learn {
  tip: string;
  next: NextStep[];
}

const eur = (cents: number) => `${Math.round(cents / 100).toLocaleString("fi-FI")} €`;

const STEP = {
  baskets: { label: "My three baskets", message: "Show my three baskets" },
  trend: { label: "6-month trend", message: "How has my spending changed over the last 6 months?" },
  persona: { label: "What kind of spender am I?", message: "What kind of spender am I?" },
  peersEveryday: { label: "Compare with others", message: "How does my everyday spending compare with similar people?" },
} satisfies Record<string, NextStep>;

export function learnBreakdown(d: BasketBreakdown): Learn {
  const [, irregular, everyday] = d.baskets;
  const tip =
    irregular.share_pct >= 15
      ? `Mandatory & irregular costs (${irregular.share_pct.toLocaleString("fi-FI")} % here) come as surprises. ` +
        "A small buffer saved for them keeps a dentist bill or a repair from hurting your month."
      : everyday.amount_cents > 0
        ? `Everyday spending is the basket you control most. Spending 10 % less there would keep about ` +
          `${eur(everyday.amount_cents * 0.1)} this month.`
        : "S-Bank's three baskets separate fixed costs, surprise costs and everyday choices, so you can see what you can change.";
  return { tip, next: [STEP.persona, STEP.trend, STEP.peersEveryday] };
}

export function learnTrend(d: BasketTrend): Learn {
  // Compare full months only: the last month may still be in progress.
  const full = lastMonthIsPartial(d) ? d.months.slice(0, -1) : d.months;
  const everyday = (i: number) => full[i]?.baskets.find((b) => b.basket === "everyday")?.amount_cents ?? 0;
  let tip = "Watching a trend shows slow changes that a single month hides.";
  if (full.length >= 2 && everyday(0) > 0) {
    const change = ((everyday(full.length - 1) - everyday(0)) / everyday(0)) * 100;
    const from = monthShort(full[0].month);
    const to = monthShort(full[full.length - 1].month);
    if (change >= 10) {
      tip = `Everyday spending grew ${Math.round(change)} % from ${from} to ${to}. Small, slow growth like this is called lifestyle creep.`;
    } else if (change <= -10) {
      tip = `Everyday spending fell ${Math.round(-change)} % from ${from} to ${to}. Nice: small changes add up over months.`;
    } else {
      tip = `Everyday spending stayed steady from ${from} to ${to}. Steady habits make planning much easier.`;
    }
  }
  return { tip, next: [STEP.baskets, STEP.persona] };
}

export function learnSpending(d: SpendingSummary): Learn {
  const days =
    (Date.parse(`${d.query.to_date}T00:00:00Z`) - Date.parse(`${d.query.from_date}T00:00:00Z`)) / 86_400_000 + 1;
  const tip =
    d.amount_cents > 0 && days > 0
      ? `At this pace, ${d.label.toLowerCase()} adds up to about ${eur((d.amount_cents / days) * 365)} a year.`
      : `No ${d.label.toLowerCase()} spending in this period. Every period without it is money kept.`;
  const next: NextStep[] = [STEP.baskets, STEP.persona];
  if (d.query.category) {
    next.unshift({
      label: `Compare ${d.query.category}`,
      message: `How does my ${d.query.category.toLowerCase()} spending compare with similar people?`,
    });
  } else if (d.query.basket === "everyday") {
    next.unshift(STEP.peersEveryday);
  }
  return { tip, next };
}

export function learnProfile(_: SpenderProfile): Learn {
  return {
    tip: "Your profile comes from when and how you buy, not how much you earn. It can change from month to month.",
    next: [STEP.peersEveryday, STEP.trend],
  };
}

export function learnPeers(d: PeerBenchmark): Learn {
  const tip = d.open_data
    ? "Statistics Finland's numbers come from the national Household Budget Survey of thousands of Finnish homes."
    : "The median is the middle person: half of similar customers spend more than it, half spend less.";
  return { tip, next: [STEP.baskets, STEP.persona] };
}
