/** Lets a card put fixed messages into the chat (no model call, so it is instant and always works). */
let handler: ((text: string, question?: string) => void) | null = null;

export function registerChatNote(h: (text: string, question?: string) => void): () => void {
  handler = h;
  return () => {
    if (handler === h) handler = null;
  };
}

/** Adds an assistant message, preceded by the customer's question when given. Returns false when no chat listens. */
export function postChatNote(text: string, question?: string): boolean {
  if (!handler) return false;
  handler(text, question);
  return true;
}
