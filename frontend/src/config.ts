export const brand = {
  bankName: "Pankki",
  cardName: "Etukortti",
};

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
export const COACH_URL: string =
  process.env.EXPO_PUBLIC_COACH_URL ?? "http://localhost:5173";
export const DEMO_CUSTOMER_ID: string =
  process.env.EXPO_PUBLIC_DEMO_CUSTOMER_ID ?? "CUST00001";

/** Coach URL with the session token in the fragment (never sent to servers). */
export function buildCoachUrl(coachUrl: string, token: string): string {
  const base = coachUrl.split("#")[0];
  return `${base}#token=${encodeURIComponent(token)}`;
}

export function sessionEndpoint(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, "")}/demo/session`;
}

/** Turns any failure into a user-facing message. Never includes the token. */
export function describeSessionError(err: unknown, status?: number): string {
  if (status === 404) return "Demo customer not found.";
  if (status === 400) return "Invalid demo customer id.";
  if (status !== undefined) return `Coach sign-in failed (HTTP ${status}).`;
  if (err instanceof Error && err.name === "AbortError") return "Coach sign-in timed out.";
  return "Could not reach the coach backend.";
}

/** True if a WebView/iframe postMessage payload is the token-expired signal. */
export function isTokenExpiredMessage(data: unknown): boolean {
  let value = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return false;
    }
  }
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "token-expired"
  );
}
