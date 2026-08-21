import { describe, expect, it } from "vitest";

import {
  AIConfigurationError,
  DEFAULT_AVALAI_BASE_URL,
  loadAIConfig,
} from "./config";

describe("AI configuration", () => {
  it("loads validated AvalAI settings with bounded defaults", () => {
    const config = loadAIConfig({
      AVALAI_API_KEY: "aa-test-key",
      AVALAI_MODEL: "test-model",
    });

    expect(config).toEqual({
      provider: "avalai",
      apiKey: "aa-test-key",
      baseUrl: DEFAULT_AVALAI_BASE_URL,
      modelId: "test-model",
      requestTimeoutMs: 45_000,
      maxOutputTokens: 1_200,
      retrievalLimit: 6,
    });
  });

  it("normalizes a configured HTTPS base URL", () => {
    const config = loadAIConfig({
      AVALAI_API_KEY: "aa-test-key",
      AVALAI_MODEL: "test-model",
      AVALAI_BASE_URL: "https://api.avalai.org/v1/",
    });

    expect(config.baseUrl).toBe("https://api.avalai.org/v1");
  });

  it.each([
    {},
    { AVALAI_API_KEY: "aa-test-key" },
    {
      AVALAI_API_KEY: "aa-test-key",
      AVALAI_MODEL: "test-model",
      AVALAI_BASE_URL: "http://api.avalai.ir/v1",
    },
  ])("rejects incomplete or unsafe settings", (environment) => {
    expect(() => loadAIConfig(environment)).toThrow(AIConfigurationError);
  });
});
