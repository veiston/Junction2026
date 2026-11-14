import { getToken } from "../auth/token";
import type { ErrorBody, ErrorResponse } from "../contracts-temp";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ErrorBody) {
    super(body.message);
    this.name = "ApiError";
  }
}

const BASE = "/api";

export type Method = "GET" | "POST" | "PUT";

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, { code: "INTERNAL_ERROR", message: "Cannot reach the server.", details: [], request_id: "" });
  }

  if (!res.ok) {
    let parsed: ErrorResponse | undefined;
    try {
      parsed = (await res.json()) as ErrorResponse;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      res.status,
      parsed?.error ?? { code: "INTERNAL_ERROR", message: `Request failed (${res.status}).`, details: [], request_id: "" },
    );
  }
  return (await res.json()) as T;
}

export const api = { request };
