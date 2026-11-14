let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(value: string | null): void {
  token = value;
}

/** Reads `#token=...` from the URL, keeps it in memory only, then removes it from the address bar. */
export function consumeTokenFromUrl(loc: Location = window.location, hist: History = window.history): string | null {
  const params = new URLSearchParams(loc.hash.replace(/^#/, ""));
  const found = params.get("token");
  if (!found) return token;
  token = found;
  params.delete("token");
  const rest = params.toString();
  hist.replaceState(null, "", `${loc.pathname}${loc.search}${rest ? `#${rest}` : ""}`);
  return token;
}
