import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter, RateLimitExceededError } from "./rate-limit";

describe("in-memory chat rate limiter", () => {
  it("limits each key within a fixed window and resets afterward", () => {
    let now = 1_000;
    const limiter = createInMemoryRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      now: () => now,
    });

    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-b").allowed).toBe(true);
    expect(limiter.check("client-a")).toEqual({
      allowed: false,
      retryAfterMs: 1_000,
    });

    now = 2_000;
    expect(limiter.check("client-a").allowed).toBe(true);
  });

  it("converts retry delays to a safe Retry-After value", () => {
    expect(new RateLimitExceededError(1_001).retryAfterSeconds).toBe(2);
    expect(new RateLimitExceededError(0).retryAfterSeconds).toBe(1);
  });
});
