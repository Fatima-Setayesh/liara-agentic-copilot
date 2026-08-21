import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import type { AIConfig } from "../config";
import type { AIProvider } from "../types";

export interface AvalAIProviderOptions {
  readonly fetch?: typeof globalThis.fetch;
}

export function createAvalAIProvider(
  config: AIConfig,
  options: AvalAIProviderOptions = {},
): AIProvider {
  const provider = createOpenAICompatible({
    name: "avalai",
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    includeUsage: true,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  });

  return Object.freeze({
    providerId: "avalai",
    modelId: config.modelId,
    model: provider.chatModel(config.modelId),
  });
}