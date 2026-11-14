import type { ChatRequest } from "@/contracts";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-09-15" -> "September 2026"; null when unknown. */
export function monthName(today?: string | null): string | null {
  const m = today ? /^(\d{4})-(\d{2})/.exec(today) : null;
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
}

/** What the typing bubble says while the coach works, step by step (the last step stays). */
export function typingSteps(req: ChatRequest | null, today?: string | null): string[] {
  if (!req) return [];
  const month = monthName(today);
  switch (req.quick_action) {
    case "understand_my_money":
      return [
        "Reading your transactions…",
        month ? `Building your ${month} summary…` : "Building your monthly summary…",
        "Sorting it into your three baskets…",
      ];
    case "plan_my_finances":
      return ["Looking at your balance…", "Checking what is coming up…"];
    case "improve_my_habits":
      return ["Looking at your everyday spending…", "Finding a good goal for you…"];
    default:
      return ["Reading your question…", "Looking at your transactions…", "Doing the math…"];
  }
}
