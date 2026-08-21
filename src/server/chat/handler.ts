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
  type GroundedChatService,
} from "@/server/agent";
import { RetrievalConfigurationError } from "@/server/retrieval";

const MAX_CHAT_REQUEST_BYTES = 48_000;
const SAFE_STREAM_ERROR_MESSAGE = "The chat response could not be completed.";

class InvalidChatRequestError extends Error {
  constructor() {
    super("The request body is invalid");
    this.name = "InvalidChatRequestError";
  }
}

export interface ChatHandlerDependencies {
  readonly getService: () => GroundedChatService;
  readonly generateId?: () => string;
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
      return "The AI provider is temporarily rate limited. Please retry later.";
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

function jsonErrorResponse(error: ChatError): Response {
  const body: ChatErrorResponse = {
    version: CHAT_CONTRACT_VERSION,
    error,
  };

  return Response.json(body, {
    status: errorStatus(error.code),
    headers: {
      "Cache-Control": "no-store",
      "X-Request-Id": error.requestId,
    },
  });
}

function preStreamError(error: unknown, requestId: string): ChatError {
  if (error instanceof InvalidChatRequestError) {
    return chatError("INVALID_INPUT", requestId, false);
  }

  if (error instanceof AIConfigurationError) {
    return chatError("MODEL_UNAVAILABLE", requestId, false);
  }

  if (error instanceof RetrievalConfigurationError) {
    return chatError("RETRIEVAL_FAILED", requestId, false);
  }

  return chatError("INTERNAL_ERROR", requestId, false);
}

async function readRequestJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase();
  if (contentType?.startsWith("application/json") !== true) {
    throw new InvalidChatRequestError();
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_CHAT_REQUEST_BYTES
  ) {
    throw new InvalidChatRequestError();
  }

  if (request.body === null) {
    throw new InvalidChatRequestError();
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteCount = 0;
  let text = "";

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

function logSafeFailure(requestId: string, error: ChatError): void {
  console.error("chat_request_failed", {
    requestId,
    code: error.code,
    retryable: error.retryable,
  });
}

export function createChatPostHandler(
  dependencies: ChatHandlerDependencies,
): (request: Request) => Promise<Response> {
  const generateId = dependencies.generateId ?? randomUUID;

  return async function handleChatPost(request: Request): Promise<Response> {
    let requestId = `request_${generateId()}`;
    let parsedRequest;
    let service;

    try {
      const rawBody = await readRequestJson(request);
      const parsed = chatRequestSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new InvalidChatRequestError();
      }

      parsedRequest = parsed.data;
      requestId = parsedRequest.clientRequestId ?? requestId;
      service = dependencies.getService();
    } catch (error) {
      const safeError = preStreamError(error, requestId);
      logSafeFailure(requestId, safeError);
      return jsonErrorResponse(safeError);
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
          writeAgentState(writer, "understanding");
          writeAgentState(writer, "retrieving");

          const result = await service.answer({
            request: parsedRequest,
            signal: operationSignal,
          });

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
            return;
          }

          for (const citation of result.citations) {
            writeCitation(writer, citation);
          }
          writeAgentState(writer, "generating");

          let modelStreamError: unknown = null;
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
            writer.write(part);
          }

          if (request.signal.aborted) {
            writeOutcome(writer, { status: "cancelled" });
            writer.write({ type: "abort", reason: "cancelled" });
            return;
          }

          if (timeoutSignal.aborted) {
            throw timeoutSignal.reason;
          }

          writeOutcome(writer, {
            status: "completed",
            evidenceStatus: result.evidenceStatus,
          });
          writer.write({
            type: "finish",
            finishReason: "stop",
            messageMetadata: metadata,
          });
        } catch (error) {
          if (request.signal.aborted) {
            writeOutcome(writer, { status: "cancelled" });
            writer.write({ type: "abort", reason: "cancelled" });
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
          logSafeFailure(requestId, safeError);
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
