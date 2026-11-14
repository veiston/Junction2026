import { API_BASE_URL } from "@/config";
import { getToken } from "@/auth/token";
import type { DemoSessionRequest, ErrorBody, ErrorResponse, Me, SessionToken } from "@/contracts";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ErrorBody) {
    super(body.message);
    this.name = "ApiError";
  }
}

export type Method = "GET" | "POST" | "PUT";

const TIMEOUT_MS = 10_000;

function fallbackError(message: string): ErrorBody {
  return { code: "INTERNAL_ERROR", message, details: [], request_id: "" };
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, fallbackError("Cannot reach the server."));
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
