import { useSyncExternalStore } from "react";

/**
 * Which model answers the chat: Gemini in the cloud (default), Ollama on the host machine ("local"),
 * or LiteRT-LM running inside the backend ("litert"). Only one can be on at a time.
 */
export type ModelProvider = "cloud" | "local" | "litert";

// In memory only, like the session token: a reload goes back to the cloud model.
let provider: ModelProvider = "cloud";
const listeners = new Set<() => void>();

export function getModelProvider(): ModelProvider {
  return provider;
}

export function setModelProvider(value: ModelProvider): void {
  provider = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useModelProvider(): ModelProvider {
  return useSyncExternalStore(subscribe, getModelProvider);
}
