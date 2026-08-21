import { describe, expect, it } from "vitest";

import { ChatConfigurationError, loadChatRuntimeConfig } from "./config";

describe("chat runtime configuration", () => {
  it("uses bounded defaults", () => {
    expect(loadChatRuntimeConfig({})).toEqual({
      rateLimitMaxRequests: 20,
      rateLimitWindowMs: 60_000,
    });
  });

  it("rejects unsafe rate-limit values", () => {
    expect(() =>
      loadChatRuntimeConfig({ CHAT_RATE_LIMIT_MAX_REQUESTS: "0" }),
    ).toThrow(ChatConfigurationError);
  });
});
