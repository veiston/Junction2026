import { API_BASE_URL } from "@/config";
import { getToken } from "@/auth/token";
import { getModelProvider } from "./modelProvider";
import type { DemoSessionRequest, ErrorBody, ErrorResponse, Me, SessionToken } from "@/contracts";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ErrorBody) {
    super(body.message);
    this.name = "ApiError";
  }
}

export type Method = "GET" | "POST" | "PUT";

const TIMEOUT_MS = 10_000;
/** A chat turn waits for Gemini (up to 3 tool rounds), so it gets a longer limit than other calls. */
export const CHAT_TIMEOUT_MS = 60_000;

function fallbackError(message: string): ErrorBody {
  return { code: "INTERNAL_ERROR", message, details: [], request_id: "" };
}

export async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  timeoutMs: number = TIMEOUT_MS,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (path === "/chat" && getModelProvider() === "local") headers["X-Model-Provider"] = "local";
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      fallbackError(timedOut ? "The server took too long to answer." : "Cannot reach the server."),
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let parsed: ErrorResponse | undefined;
    try {
      parsed = (await res.json()) as ErrorResponse;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, parsed?.error ?? fallbackError(`Request failed (${res.status}).`));
  }
  return (await res.json()) as T;
}

export const api = {
  request,
  createDemoSession: (customerId: string) =>
    request<SessionToken>("POST", "/demo/session", { customer_id: customerId } satisfies DemoSessionRequest),
  getMe: () => request<Me>("GET", "/me"),
};
