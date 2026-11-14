import { useCallback } from "react";

import type { ChallengeProgress, StartChallengeRequest } from "@/contracts";
import type { WidgetHostApi } from "@/chat/registry";

import { useAction } from "./useAction";

/** POST /habits/challenges. 201 gives the new progress, 409 already active, 404 unknown template. */
export function useStartChallenge(api: WidgetHostApi) {
  const run = useCallback(
    (templateId: string) =>
      api.request<ChallengeProgress>("POST", "/habits/challenges", {
        template_id: templateId,
      } satisfies StartChallengeRequest),
    [api],
  );
  const { execute, ...state } = useAction(run);
  return {
    ...state,
    start: execute,
    alreadyActive: state.errorStatus === 409,
    notFound: state.errorStatus === 404,
  };
}
