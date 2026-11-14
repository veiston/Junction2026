/**
 * Lets a card ask the assistant a question about itself. The chat shows only the question as the customer's
 * message; the card's own numbers travel with it so the assistant answers from them.
 */
let handler: ((question: string, facts: string) => void) | null = null;

export function registerChatAsk(h: (question: string, facts: string) => void): () => void {
  handler = h;
  return () => {
    if (handler === h) handler = null;
  };
}

/** Returns false when no chat screen is listening, so the caller can fall back to a plain message. */
export function postChatAsk(question: string, facts: string): boolean {
  if (!handler) return false;
  handler(question, facts);
  return true;
}
