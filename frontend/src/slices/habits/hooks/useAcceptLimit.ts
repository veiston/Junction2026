import { useCallback } from "react";

import type { CreateLimitRequest, SpendingLimit } from "@/contracts";
import type { WidgetHostApi } from "@/chat/registry";

import { useAction } from "./useAction";

/** POST /habits/limits. 201 gives the confirmed limit, 409 means one already exists for the month. */
export function useAcceptLimit(api: WidgetHostApi) {
  const run = useCallback(
    (body: CreateLimitRequest) => api.request<SpendingLimit>("POST", "/habits/limits", body),
    [api],
  );
  const { execute, ...state } = useAction(run);
  return { ...state, accept: execute, alreadySet: state.errorStatus === 409 };
}
