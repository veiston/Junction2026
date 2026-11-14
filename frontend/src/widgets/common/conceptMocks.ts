import type { ConceptNote } from "@/contracts";

export const conceptMocks: Record<ConceptNote["id"], ConceptNote> = {
  small_purchases_add_up: {
    id: "small_purchases_add_up",
    title: "Small purchases add up",
    text: "You took 3 taxi rides for 99,26 EUR in one week. Small, regular purchases rarely feel big one by one. Over a year they can add up to a large amount.",
  },
  compare_equal_periods: {
    id: "compare_equal_periods",
    title: "Compare equal periods",
    text: "We compare your 7 experiment days with the 7 days before. Periods of the same length make the comparison fair.",
  },
  fixed_vs_everyday: {
    id: "fixed_vs_everyday",
    title: "Fixed and everyday spending",
    text: "Rent and bills are fixed, so they are hard to change quickly. Everyday spending such as taxis and food is where small changes are easiest.",
  },
  spending_pace: {
    id: "spending_pace",
    title: "Spending pace",
    text: "Pace is how much you spend per day so far. Seeing it early lets you adjust before the week ends.",
  },
  one_week_is_not_proof: {
    id: "one_week_is_not_proof",
    title: "One week is not proof",
    text: "A single week can be unusual because of travel or weather. Repeat the experiment to see if the change holds.",
  },
};
