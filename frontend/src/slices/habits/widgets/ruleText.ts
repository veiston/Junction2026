import type { ChallengeRule } from "@/contracts";

/** Plain-language form of a challenge rule. */
export function ruleText(rule: ChallengeRule | undefined, formatCents: (c: number) => string): string {
  if (!rule) return "";
  switch (rule.kind) {
    case "zero_spend":
      return "No spending in this category";
    case "max_amount":
      return `Spend at most ${formatCents(rule.amount_cents ?? 0)}`;
    case "max_count":
      return `At most ${rule.count ?? 0} purchases`;
    default:
      return "";
  }
}
