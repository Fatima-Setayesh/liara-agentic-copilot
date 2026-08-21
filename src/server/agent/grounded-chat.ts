import { streamText, type TextStreamPart, type ToolSet } from "ai";

import type {
  ChatRequest,
  Citation,
  EvidenceStatus,
  UserContext,
} from "@/contracts";
import {
  buildAIContext,
  buildGroundedPrompt,
  SYSTEM_PROMPT,
  type AIConfig,
  type AIProvider,
} from "@/server/ai";
import type { RetrievalOutcome, Retriever } from "@/server/retrieval";

import { createCitations } from "./citations";

export interface GroundedChatDependencies {
  readonly aiConfig: AIConfig;
  readonly aiProvider: AIProvider;
  readonly getRetriever: () => Promise<Retriever>;
}

export interface GroundedChatInput {
  readonly request: ChatRequest;
  readonly signal: AbortSignal;
}

export type GroundedChatResult =
  | {
      readonly kind: "no_evidence";
      readonly answer: string;
      readonly citations: readonly Citation[];
      readonly evidenceStatus: "none";
    }
  | {
      readonly kind: "stream";
      readonly stream: ReadableStream<TextStreamPart<ToolSet>>;
      readonly citations: readonly Citation[];
      readonly evidenceStatus: Exclude<EvidenceStatus, "none">;
    };

export interface GroundedChatService {
  readonly requestTimeoutMs: number;
  answer(input: GroundedChatInput): Promise<GroundedChatResult>;
}

export class GroundedChatError extends Error {
  readonly code = "RETRIEVAL_FAILED" as const;
  readonly retryable = true;

  constructor(cause: unknown) {
    super("Official documentation retrieval failed");
    this.name = "GroundedChatError";
    this.cause = cause;
  }
}

async function waitForRetriever(
  retrieverPromise: Promise<Retriever>,
  signal: AbortSignal,
): Promise<Retriever> {
  signal.throwIfAborted();

  return new Promise<Retriever>((resolve, reject) => {
    const abort = (): void => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });

    void retrieverPromise.then(
      (retriever) => {
        signal.removeEventListener("abort", abort);
        resolve(retriever);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function isPersian(question: string, userContext: UserContext | undefined): boolean {
  return (
    userContext?.preferredLanguage?.toLowerCase().startsWith("fa") === true ||
    /[\u0600-\u06ff]/u.test(question)
  );
}

function noEvidenceAnswer(
  question: string,
  userContext: UserContext | undefined,
): string {
  if (isPersian(question, userContext)) {
    return "در مستندات رسمی لیارا شواهد کافی برای پاسخ مطمئن پیدا نکردم. اگر سرویس، فریم‌ورک و مرحله‌ای که در آن مشکل رخ می‌دهد را مشخص کنید، می‌توانم جست‌وجوی دقیق‌تری انجام دهم.";
  }

  return "I could not find enough reliable evidence in the official Liara documentation to answer confidently. Please specify the Liara service, framework, and the step where the issue occurs so I can search more precisely.";
}

function retrievalText(request: ChatRequest): string {
  const contextTerms = [
    request.userContext?.framework,
    request.userContext?.runtime,
    request.userContext?.liaraService,
  ].filter((value): value is string => value !== undefined);

  return [request.message, ...contextTerms].join(" ");
}

export function createGroundedChatService(
  dependencies: GroundedChatDependencies,
): GroundedChatService {
  return Object.freeze({
    requestTimeoutMs: dependencies.aiConfig.requestTimeoutMs,

    async answer(input: GroundedChatInput): Promise<GroundedChatResult> {
      input.signal.throwIfAborted();
      let outcome: RetrievalOutcome;

      try {
        const retriever = await waitForRetriever(
          dependencies.getRetriever(),
          input.signal,
        );
        input.signal.throwIfAborted();
        outcome = await retriever.retrieve(
          {
            text: retrievalText(input.request),
            limit: dependencies.aiConfig.retrievalLimit,
            category: null,
            frameworkOrRuntime: null,
            service: null,
          },
          { signal: input.signal },
        );
      } catch (error) {
        if (input.signal.aborted) {
          throw error;
        }
        throw new GroundedChatError(error);
      }

      if (outcome.kind === "no_matches") {
        return Object.freeze({
          kind: "no_evidence",
          answer: noEvidenceAnswer(
            input.request.message,
            input.request.userContext,
          ),
          citations: Object.freeze([]),
          evidenceStatus: "none",
        });
      }

      const context = buildAIContext(outcome.matches);

      if (context.evidence.length === 0) {
        return Object.freeze({
          kind: "no_evidence",
          answer: noEvidenceAnswer(
            input.request.message,
            input.request.userContext,
          ),
          citations: Object.freeze([]),
          evidenceStatus: "none",
        });
      }

      const result = streamText({
        model: dependencies.aiProvider.model,
        instructions: SYSTEM_PROMPT,
        prompt: buildGroundedPrompt({
          question: input.request.message,
          context,
          userContext: input.request.userContext,
        }),
        maxOutputTokens: dependencies.aiConfig.maxOutputTokens,
        maxRetries: 2,
        abortSignal: input.signal,
        timeout: {
          totalMs: dependencies.aiConfig.requestTimeoutMs,
          firstChunkMs: Math.min(
            15_000,
            dependencies.aiConfig.requestTimeoutMs,
          ),
        },
        onEnd: ({ usage }) => {
          console.info({
            component: "ai",
            event: "ai_token_usage",
            provider: dependencies.aiProvider.providerId,
            model: dependencies.aiProvider.modelId,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
          });
        },
      });

      return Object.freeze({
        kind: "stream",
        stream: result.stream,
        citations: createCitations(context.evidence),
        // The lexical baseline has not yet earned a calibrated "sufficient" threshold.
        evidenceStatus: "partial",
      });
    },
  });
}
