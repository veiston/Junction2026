import { api, ApiError } from "@/api/client";
import { setToken } from "@/auth/token";
import { DEMO_CUSTOMER_ID } from "@/config";

/** Creates a demo session and keeps the token in memory. */
export async function startSession(): Promise<void> {
  const session = await api.createDemoSession(DEMO_CUSTOMER_ID);
  setToken(session.token);
}

/**
 * Runs an API call; on a 401 it creates a new demo session once and retries.
 * A second failure is thrown to the caller.
 */
export async function withSession<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await startSession();
      return call();
    }
    throw err;
  }
}
