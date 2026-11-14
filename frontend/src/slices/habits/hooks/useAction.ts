import { useCallback, useRef, useState } from "react";

export interface ActionState<TResult> {
  loading: boolean;
  /** HTTP status of the failure (0 = network), or null when there is no error. */
  errorStatus: number | null;
  errorMessage: string | null;
  result: TResult | null;
}

/** Shared loading / error / result state for a single POST action. */
export function useAction<TArg, TResult>(run: (arg: TArg) => Promise<TResult>) {
  const [state, setState] = useState<ActionState<TResult>>({
    loading: false,
    errorStatus: null,
    errorMessage: null,
    result: null,
  });
  const busy = useRef(false);

  const execute = useCallback(
    async (arg: TArg) => {
      if (busy.current) return;
      busy.current = true;
      setState({ loading: true, errorStatus: null, errorMessage: null, result: null });
      try {
        const result = await run(arg);
        setState({ loading: false, errorStatus: null, errorMessage: null, result });
      } catch (e) {
        const err = e as { status?: number; message?: string };
        setState({
          loading: false,
          errorStatus: typeof err.status === "number" ? err.status : 0,
          errorMessage: err.message ?? "Something went wrong.",
          result: null,
        });
      } finally {
        busy.current = false;
      }
    },
    [run],
  );

  return { ...state, execute };
}
