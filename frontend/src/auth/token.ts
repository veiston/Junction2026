// The session token lives in memory only: never in URLs, storage or logs.
let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(value: string | null): void {
  token = value;
}
