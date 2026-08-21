import { z } from "zod";

const chatRuntimeEnvironmentSchema = z.object({
  CHAT_RATE_LIMIT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .default(20),
  CHAT_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .default(60_000),
});

export interface ChatRuntimeConfig {
  readonly rateLimitMaxRequests: number;
  readonly rateLimitWindowMs: number;
}

export class ChatConfigurationError extends Error {
  constructor() {
    super("Server chat configuration is incomplete or invalid");
    this.name = "ChatConfigurationError";
  }
}

export function loadChatRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ChatRuntimeConfig {
  const parsed = chatRuntimeEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new ChatConfigurationError();
  }

  return Object.freeze({
    rateLimitMaxRequests: parsed.data.CHAT_RATE_LIMIT_MAX_REQUESTS,
    rateLimitWindowMs: parsed.data.CHAT_RATE_LIMIT_WINDOW_MS,
  });
}
