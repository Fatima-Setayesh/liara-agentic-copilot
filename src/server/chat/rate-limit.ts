import { createHash } from "node:crypto";

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
}

export interface ChatRateLimiter {
  check(key: string): RateLimitDecision;
}

export interface InMemoryRateLimiterOptions {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly maxKeys?: number;
  readonly now?: () => number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX_KEYS = 10_000;

export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    super("The chat request rate limit was exceeded");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
  }
}

function removeExpiredBuckets(
  buckets: Map<string, RateLimitBucket>,
  now: number,
): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createInMemoryRateLimiter(
  options: InMemoryRateLimiterOptions,
): ChatRateLimiter {
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const buckets = new Map<string, RateLimitBucket>();

  return Object.freeze({
    check(key: string): RateLimitDecision {
      const checkedAt = now();
      let bucket = buckets.get(key);

      if (bucket !== undefined && bucket.resetAt <= checkedAt) {
        buckets.delete(key);
        bucket = undefined;
      }

      if (bucket === undefined) {
        if (buckets.size >= maxKeys) {
          removeExpiredBuckets(buckets, checkedAt);
        }

        if (buckets.size >= maxKeys) {
          const oldestKey = buckets.keys().next().value as string | undefined;
          if (oldestKey !== undefined) buckets.delete(oldestKey);
        }

        buckets.set(key, {
          count: 1,
          resetAt: checkedAt + options.windowMs,
        });
        return Object.freeze({ allowed: true, retryAfterMs: 0 });
      }

      if (bucket.count >= options.maxRequests) {
        return Object.freeze({
          allowed: false,
          retryAfterMs: Math.max(1, bucket.resetAt - checkedAt),
        });
      }

      bucket.count += 1;
      return Object.freeze({ allowed: true, retryAfterMs: 0 });
    },
  });
}

function firstForwardedAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();

  return (
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unidentified-client"
  ).slice(0, 128);
}

export function createRateLimitKey(request: Request): string {
  // Best-effort per-instance protection. The deployment proxy must sanitize
  // forwarding headers before they can be treated as authoritative identity.
  return createHash("sha256")
    .update(firstForwardedAddress(request))
    .digest("hex");
}
