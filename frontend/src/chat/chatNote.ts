/** Lets a card put a fixed assistant message into the chat (no model call, so it always works). */
let handler: ((text: string) => void) | null = null;

export function registerChatNote(h: (text: string) => void): () => void {
  handler = h;
  return () => {
    if (handler === h) handler = null;
  };
}

export function postChatNote(text: string): void {
  handler?.(text);
}
