import { randomUUID } from "node:crypto";

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type InferUIMessageChunk,
  type ToolSet,
} from "ai";

import {
  CHAT_CONTRACT_VERSION,
  chatRequestSchema,
  type AgentState,
  type ChatError,
  type ChatErrorCode,
  type ChatErrorResponse,
  type ChatMessageMetadata,
  type ChatOutcome,
  type ChatUIMessage,
  type Citation,
} from "@/contracts";
import {
  AIConfigurationError,
  AIError,
  normalizeAIError,
} from "@/server/ai";
import {
  GroundedChatError,
  selectReferencedCitations,
  type GroundedChatService,
} from "@/server/agent";
import { RetrievalConfigurationError } from "@/server/retrieval";

import { ChatConfigurationError } from "./config";
import {
  consoleChatLogger,
  writeChatLog,
  type ChatLogger,
} from "./logging";
import {
  createRateLimitKey,
  RateLimitExceededError,
  type ChatRateLimiter,
} from "./rate-limit";

const MAX_CHAT_REQUEST_BYTES = 16_384;
const SAFE_STREAM_ERROR_MESSAGE = "The chat response could not be completed.";

class InvalidChatRequestError extends Error {
  constructor() {
    super("The request body is invalid");
    this.name = "InvalidChatRequestError";
  }
}

export interface ChatHandlerDependencies {
  readonly getService: () => GroundedChatService;
  readonly getRateLimiter?: () => ChatRateLimiter;
  readonly getRateLimitKey?: (request: Request) => string;
  readonly logger?: ChatLogger;
  readonly generateId?: () => string;
  readonly now?: () => number;
}

function errorStatus(code: ChatErrorCode): number {
  switch (code) {
    case "INVALID_INPUT":
      return 400;
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "MODEL_UNAVAILABLE":
    case "RETRIEVAL_FAILED":
      return 503;
    case "INTERNAL_ERROR":
    case "STREAM_INTERRUPTED":
      return 500;
  }
}

function safeErrorMessage(code: ChatErrorCode): string {
  switch (code) {
    case "INVALID_INPUT":
      return "The chat request is invalid.";
    case "RATE_LIMITED":
      return "Too many chat requests were received. Please retry later.";
    case "RETRIEVAL_FAILED":
      return "Official Liara documentation retrieval is temporarily unavailable.";
    case "MODEL_UNAVAILABLE":
      return "The configured AI model is temporarily unavailable.";
    case "STREAM_INTERRUPTED":
      return "The response stream was interrupted. Please retry.";
    case "TIMEOUT":
      return "The request timed out. Please retry.";
    case "INTERNAL_ERROR":
      return "The request could not be completed.";
  }
}

function chatError(
  code: ChatErrorCode,
  requestId: string,
  retryable: boolean,
): ChatError {
  return Object.freeze({
    code,
    message: safeErrorMessage(code),
    requestId,
    retryable,
  });
}

function jsonErrorResponse(
  error: ChatError,
  additionalHeaders: Readonly<Record<string, string>> = {},
): Response {
  const body: ChatErrorResponse = {
    version: CHAT_CONTRACT_VERSION,
    error,
  };

  return Response.json(body, {
    status: errorStatus(error.code),
    headers: {
      "Cache-Control": "no-store",
      "X-Request-Id": error.requestId,
      ...additionalHeaders,
    },
  });
}

function preStreamError(error: unknown, requestId: string): ChatError {
  if (error instanceof InvalidChatRequestError) {
    return chatError("INVALID_INPUT", requestId, false);
  }

  if (error instanceof RateLimitExceededError) {
    return chatError("RATE_LIMITED", requestId, true);
  }

  if (error instanceof AIConfigurationError) {
    return chatError("MODEL_UNAVAILABLE", requestId, false);
  }

  if (error instanceof ChatConfigurationError) {
    return chatError("INTERNAL_ERROR", requestId, false);
  }

  if (error instanceof RetrievalConfigurationError) {
    return chatError("RETRIEVAL_FAILED", requestId, false);
  }

  return chatError("INTERNAL_ERROR", requestId, false);
}

async function readRequestJson(request: Request): Promise<unknown> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new InvalidChatRequestError();
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const declaredLength = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > MAX_CHAT_REQUEST_BYTES
    ) {
      throw new InvalidChatRequestError();
    }
  }

  if (request.body === null) {
    throw new InvalidChatRequestError();
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteCount = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteCount += value.byteLength;
      if (byteCount > MAX_CHAT_REQUEST_BYTES) {
        await reader.cancel();
        throw new InvalidChatRequestError();
      }
      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
  } catch (error) {
    if (request.signal.aborted || error instanceof InvalidChatRequestError) {
      throw error;
    }
    throw new InvalidChatRequestError();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InvalidChatRequestError();
  }
}

function writeAgentState(
  writer: {
    write(part: InferUIMessageChunk<ChatUIMessage>): void;
  },
  state: AgentState,
): void {
  writer.write({
    type: "data-agent-state",
    data: { state },
    transient: true,
  });
}

function writeCitation(
  writer: {
    write(part: InferUIMessageChunk<ChatUIMessage>): void;
  },
  citation: Citation,
): void {
  writer.write({ type: "data-citation", data: citation });
}

function writeOutcome(
  writer: {
    write(part: InferUIMessageChunk<ChatUIMessage>): void;
  },
  outcome: ChatOutcome,
): void {
  writer.write({ type: "data-outcome", data: outcome });
}

function writeStaticAnswer(
  writer: {
    write(part: InferUIMessageChunk<ChatUIMessage>): void;
  },
  answer: string,
): void {
  writer.write({ type: "text-start", id: "answer" });
  writer.write({ type: "text-delta", id: "answer", delta: answer });
  writer.write({ type: "text-end", id: "answer" });
}

export function createChatPostHandler(
  dependencies: ChatHandlerDependencies,
): (request: Request) => Promise<Response> {
  const generateId = dependencies.generateId ?? randomUUID;
  const getRateLimitKey = dependencies.getRateLimitKey ?? createRateLimitKey;
  const logger = dependencies.logger ?? consoleChatLogger;
  const now = dependencies.now ?? Date.now;

  return async function handleChatPost(request: Request): Promise<Response> {
    const startedAt = now();
    let requestId = `request_${generateId()}`;
    let startedLogged = false;
    let parsedRequest;
    let service;

    const logStarted = (): void => {
      if (startedLogged) return;
      startedLogged = true;
      writeChatLog(logger, { event: "chat_request_started", requestId });
    };

    const durationMs = (): number => Math.max(0, now() - startedAt);

    try {
      const rawBody = await readRequestJson(request);
      const parsed = chatRequestSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new InvalidChatRequestError();
      }

      parsedRequest = parsed.data;
      requestId = parsedRequest.clientRequestId ?? requestId;
      logStarted();

      const rateLimiter = dependencies.getRateLimiter?.();
      if (rateLimiter !== undefined) {
        const decision = rateLimiter.check(getRateLimitKey(request));
        if (!decision.allowed) {
          throw new RateLimitExceededError(decision.retryAfterMs);
        }
      }

      service = dependencies.getService();
    } catch (error) {
      logStarted();
      const safeError = preStreamError(error, requestId);
      writeChatLog(logger, {
        event: "chat_request_failed",
        requestId,
        durationMs: durationMs(),
        outcome: "failed",
        errorCode: safeError.code,
      });
      return jsonErrorResponse(
        safeError,
        error instanceof RateLimitExceededError
          ? { "Retry-After": String(error.retryAfterSeconds) }
          : {},
      );
    }

    const conversationId =
      parsedRequest.conversationId ?? `conversation_${generateId()}`;
    const metadata: ChatMessageMetadata = {
      contractVersion: CHAT_CONTRACT_VERSION,
      requestId,
      conversationId,
    };
    const timeoutSignal = AbortSignal.timeout(service.requestTimeoutMs);
    const operationSignal = AbortSignal.any([request.signal, timeoutSignal]);

    const stream = createUIMessageStream<ChatUIMessage>({
      execute: async ({ writer }) => {
        writer.write({ type: "start", messageMetadata: metadata });

        try {
          operationSignal.throwIfAborted();
          writeAgentState(writer, "understanding");

          const result = await service.answer({
            request: parsedRequest,
            signal: operationSignal,
            onAgentState: (state) => writeAgentState(writer, state),
          });

          if (result.kind === "clarification") {
            writeAgentState(writer, "clarification_required");
            writeStaticAnswer(writer, result.answer);
            writeOutcome(writer, {
              status: "completed",
              evidenceStatus: "none",
            });
            writer.write({
              type: "finish",
              finishReason: "stop",
              messageMetadata: metadata,
            });
            writeChatLog(logger, {
              event: "chat_request_completed",
              requestId,
              durationMs: durationMs(),
              outcome: "completed",
            });
            return;
          }

          if (result.kind === "no_evidence") {
            writeStaticAnswer(writer, result.answer);
            writeOutcome(writer, {
              status: "completed",
              evidenceStatus: result.evidenceStatus,
            });
            writer.write({
              type: "finish",
              finishReason: "stop",
              messageMetadata: metadata,
            });
            writeChatLog(logger, {
              event: "chat_request_completed",
              requestId,
              durationMs: durationMs(),
              outcome: "completed",
            });
            return;
          }

          writeAgentState(writer, "generating");

          let modelStreamError: unknown = null;
          let answerText = "";
          const uiStream = toUIMessageStream<ToolSet, ChatUIMessage>({
            stream: result.stream,
            sendStart: false,
            sendFinish: false,
            sendReasoning: false,
            sendSources: false,
            onError: (error) => {
              modelStreamError = error;
              return SAFE_STREAM_ERROR_MESSAGE;
            },
          });

          const reader = uiStream.getReader();
          try {
            while (true) {
              const { done, value: part } = await reader.read();
              if (done) break;

              if (part.type === "error") {
                throw modelStreamError ?? new Error(SAFE_STREAM_ERROR_MESSAGE);
              }
              if (part.type === "abort") {
                throw new AIError(
                  "STREAM_INTERRUPTED",
                  "The model stream was aborted.",
                  true,
                );
              }
              if (part.type === "text-delta") {
                answerText += "delta" in part
                  ? part.delta
                  : "text" in part && typeof part.text === "string"
                    ? part.text
                    : "";
              }
              writer.write(part);
            }
          } finally {
            reader.releaseLock();
          }

          if (request.signal.aborted) {
            writeOutcome(writer, { status: "cancelled" });
            writer.write({ type: "abort", reason: "cancelled" });
            writeChatLog(logger, {
              event: "chat_request_cancelled",
              requestId,
              durationMs: durationMs(),
              outcome: "cancelled",
            });
            return;
          }

          if (timeoutSignal.aborted) {
            throw timeoutSignal.reason;
          }

          const referencedCitations = selectReferencedCitations(
            answerText,
            result.citations,
          );
          for (const citation of referencedCitations) {
            writeCitation(writer, citation);
          }
          writeOutcome(writer, {
            status: "completed",
            evidenceStatus: referencedCitations.length > 0
              ? result.evidenceStatus
              : "none",
          });
          writer.write({
            type: "finish",
            finishReason: "stop",
            messageMetadata: metadata,
          });
          writeChatLog(logger, {
            event: "chat_request_completed",
            requestId,
            durationMs: durationMs(),
            outcome: "completed",
          });
        } catch (error) {
          if (request.signal.aborted) {
            writeOutcome(writer, { status: "cancelled" });
            writer.write({ type: "abort", reason: "cancelled" });
            writeChatLog(logger, {
              event: "chat_request_cancelled",
              requestId,
              durationMs: durationMs(),
              outcome: "cancelled",
            });
            return;
          }

          const normalized = timeoutSignal.aborted
              ? new AIError(
                  "TIMEOUT",
                  "The request timed out.",
                  true,
                  timeoutSignal.reason,
                )
              : error instanceof GroundedChatError
                ? error
              : normalizeAIError(error, "streaming");
          const safeError = chatError(
            normalized.code,
            requestId,
            normalized.retryable,
          );
          writeChatLog(logger, {
            event: "chat_request_failed",
            requestId,
            durationMs: durationMs(),
            outcome: "failed",
            errorCode: safeError.code,
          });
          writer.write({ type: "data-error", data: safeError });
          writeOutcome(writer, { status: "failed" });
          writer.write({
            type: "finish",
            finishReason: "error",
            messageMetadata: metadata,
          });
        }
      },
      onError: () => SAFE_STREAM_ERROR_MESSAGE,
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });
  };
}
