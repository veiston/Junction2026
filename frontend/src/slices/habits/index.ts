import type { SliceWidgets } from "@/contracts/widget-registry";

import { ChallengeProgress } from "./widgets/ChallengeProgress";
import { ChallengeSuggestions } from "./widgets/ChallengeSuggestions";
import { LimitProgress } from "./widgets/LimitProgress";
import { LimitReview } from "./widgets/LimitReview";
import { LimitSuggestion } from "./widgets/LimitSuggestion";

export const widgets: SliceWidgets = {
  limit_suggestion: LimitSuggestion,
  limit_progress: LimitProgress,
  limit_review: LimitReview,
  challenge_suggestions: ChallengeSuggestions,
  challenge_progress: ChallengeProgress,
};
