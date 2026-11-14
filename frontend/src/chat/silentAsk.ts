/** Lets a card ask the chat a question without showing it as something the customer typed. */
let handler: ((text: string) => void) | null = null;

export function registerSilentAsk(h: (text: string) => void): () => void {
  handler = h;
  return () => {
    if (handler === h) handler = null;
  };
}

/** Returns false when no chat screen is listening, so the caller can fall back. */
export function askSilently(text: string): boolean {
  if (!handler) return false;
  handler(text);
  return true;
}
