import { APICallError, RetryError } from "ai";

import type { ChatErrorCode } from "@/contracts";

export type AIErrorCode = Extract<
  ChatErrorCode,
  | "RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "STREAM_INTERRUPTED"
  | "TIMEOUT"
  | "INTERNAL_ERROR"
>;

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly retryable: boolean;

  constructor(
    code: AIErrorCode,
    message: string,
    retryable: boolean,
    cause: unknown = null,
  ) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.retryable = retryable;

    if (cause !== null) {
      this.cause = cause;
    }
  }
}

function unwrapRetryError(error: unknown): unknown {
  return RetryError.isInstance(error) ? error.lastError : error;
}

function hasErrorName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}

export function isCancellationError(error: unknown): boolean {
  const unwrapped = unwrapRetryError(error);
  return hasErrorName(unwrapped, "AbortError");
}

export function normalizeAIError(
  error: unknown,
  phase: "starting" | "streaming",
): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const unwrapped = unwrapRetryError(error);

  if (hasErrorName(unwrapped, "TimeoutError")) {
    return new AIError(
      "TIMEOUT",
      "The AI provider did not respond before the timeout.",
      true,
      error,
    );
  }

  if (APICallError.isInstance(unwrapped)) {
    if (unwrapped.statusCode === 429) {
      return new AIError(
        "RATE_LIMITED",
        "The AI provider is temporarily rate limited.",
        true,
        error,
      );
    }

    if (unwrapped.statusCode === 408 || unwrapped.statusCode === 504) {
      return new AIError(
        "TIMEOUT",
        "The AI provider request timed out.",
        true,
        error,
      );
    }

    return new AIError(
      "MODEL_UNAVAILABLE",
      "The configured AI model is currently unavailable.",
      unwrapped.isRetryable || (unwrapped.statusCode ?? 0) >= 500,
      error,
    );
  }

  if (isCancellationError(unwrapped)) {
    return new AIError(
      "STREAM_INTERRUPTED",
      "The response stream was interrupted.",
      true,
      error,
    );
  }

  return new AIError(
    phase === "streaming" ? "STREAM_INTERRUPTED" : "INTERNAL_ERROR",
    phase === "streaming"
      ? "The response stream was interrupted."
      : "The AI request could not be started.",
    phase === "streaming",
    error,
  );
}
