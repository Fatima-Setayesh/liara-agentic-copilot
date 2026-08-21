import { z } from "zod";

export const DEFAULT_AVALAI_BASE_URL = "https://api.avalai.ir/v1";

const httpsUrlSchema = z
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === ""
    );
  }, "Must be a credential-free HTTPS base URL")
  .transform((value) => value.replace(/\/+$/u, ""));

const aiEnvironmentSchema = z.object({
  AVALAI_API_KEY: z.string().trim().min(1),
  AVALAI_BASE_URL: httpsUrlSchema.default(DEFAULT_AVALAI_BASE_URL),
  AVALAI_MODEL: z.string().trim().min(1).max(160),
  AI_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .max(120_000)
    .default(45_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(128)
    .max(4_096)
    .default(1_200),
  AI_RETRIEVAL_LIMIT: z.coerce.number().int().min(1).max(10).default(6),
});

export interface AIConfig {
  readonly provider: "avalai";
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly requestTimeoutMs: number;
  readonly maxOutputTokens: number;
  readonly retrievalLimit: number;
}

export class AIConfigurationError extends Error {
  constructor() {
    super("Server AI configuration is incomplete or invalid");
    this.name = "AIConfigurationError";
  }
}

export function loadAIConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AIConfig {
  const parsed = aiEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new AIConfigurationError();
  }

  return Object.freeze({
    provider: "avalai",
    apiKey: parsed.data.AVALAI_API_KEY,
    baseUrl: parsed.data.AVALAI_BASE_URL,
    modelId: parsed.data.AVALAI_MODEL,
    requestTimeoutMs: parsed.data.AI_REQUEST_TIMEOUT_MS,
    maxOutputTokens: parsed.data.AI_MAX_OUTPUT_TOKENS,
    retrievalLimit: parsed.data.AI_RETRIEVAL_LIMIT,
  });
}
