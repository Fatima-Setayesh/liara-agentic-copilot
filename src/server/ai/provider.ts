import type { AIConfig } from "./config";
import { createAvalAIProvider } from "./providers/avalai";
import type { AIProvider } from "./types";

export function createAIProvider(config: AIConfig): AIProvider {
  return createAvalAIProvider(config);
}
