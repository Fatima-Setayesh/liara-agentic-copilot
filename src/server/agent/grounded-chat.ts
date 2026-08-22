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
  const preferredLanguage = userContext?.preferredLanguage?.trim().toLowerCase();

  if (preferredLanguage) {
    return (
      preferredLanguage === "fa" ||
      preferredLanguage.startsWith("fa-") ||
      preferredLanguage === "persian"
    );
  }

  return /[\u0600-\u06ff]/u.test(question);
}

const GREETING_INTENTS = new Set([
  "hello",
  "hey",
  "hi",
  "good morning",
  "good evening",
  "\u0633\u0644\u0627\u0645",
  "\u062f\u0631\u0648\u062f",
  "\u0633\u0644\u0627\u0645 \u0639\u0644\u06cc\u06a9",
  "\u0633\u0644\u0627\u0645 \u062e\u0648\u0628\u06cc",
  "\u062e\u0648\u0628\u06cc",
]);

const THANKS_INTENTS = new Set([
  "thanks",
  "thank you",
  "thank you very much",
  "\u0645\u0645\u0646\u0648\u0646",
  "\u0645\u0631\u0633\u06cc",
  "\u0645\u062a\u0634\u06a9\u0631\u0645",
  "\u062e\u06cc\u0644\u06cc \u0645\u0645\u0646\u0648\u0646",
]);

const ACKNOWLEDGEMENT_INTENTS = new Set([
  "\u0628\u0627\u0634\u0647",
  "\u0627\u0648\u06a9\u06cc",
  "\u0627\u0648\u06a9\u06cc\u0647",
  "ok",
  "okay",
  "got it",
]);

const META_CONVERSATION_PATTERNS = [
  /^\u0647\u0646\u0648\u0632 (?:\u0633\u0648\u0627\u0644 ?\u0645\u0648|\u0633\u0648\u0627\u0644\u0645|\u0633\u0648\u0627\u0644 \u0631\u0627) \u0646\u06af\u0641\u062a\u0645(?: \u06a9\u0647)?$/u,
  /^\u0647\u0646\u0648\u0632 \u0646\u06af\u0641\u062a\u0645 \u0686\u06cc \u0645\u06cc ?\u062e\u0648\u0627\u0645(?: \u06a9\u0647)?$/u,
  /^\u0645\u06cc ?\u062a\u0648\u0646\u06cc \u06a9\u0645\u06a9\u0645 \u06a9\u0646\u06cc$/u,
  /^(?:\u0641\u0639\u0644\u0627 \u0641\u0642\u0637 )?(?:\u06cc\u0647|\u06cc\u06a9) \u0633\u0648\u0627\u0644 \u062f\u0627\u0631\u0645$/u,
  /^(?:\u0635\u0628\u0631 \u06a9\u0646|\u0627\u062f\u0627\u0645\u0647 \u0628\u062f\u0647)$/u,
  /^can you help me$/u,
  /^i (?:haven t|have not) asked my question yet$/u,
  /^i have a question$/u,
  /^(?:wait|continue)$/u,
] as const;

function normalizeConversationIntent(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("\u064a", "\u06cc")
    .replaceAll("\u0643", "\u06a9")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function directConversationAnswer(
  question: string,
  userContext: UserContext | undefined,
): string | null {
  const normalizedQuestion = normalizeConversationIntent(question);
  const persian = isPersian(question, userContext);

  const greetingWithHelp = /^(?:\u0633\u0644\u0627\u0645|\u062f\u0631\u0648\u062f)(?: \u062e\u0648\u0628\u06cc)?(?: \u0645\u06cc ?\u062a\u0648\u0646\u06cc \u06a9\u0645\u06a9\u0645 \u06a9\u0646\u06cc)?$/u;

  if (
    GREETING_INTENTS.has(normalizedQuestion) ||
    greetingWithHelp.test(normalizedQuestion)
  ) {
    return persian
      ? "\u0633\u0644\u0627\u0645! \u062d\u062a\u0645\u0627\u064b \ud83d\ude42 \u0628\u06af\u0648 \u062f\u0631\u0628\u0627\u0631\u0647 Liara \u0686\u0647 \u06a9\u0645\u06a9\u06cc \u0645\u06cc\u200c\u062e\u0648\u0627\u06cc."
      : "Hello! How can I help you with Liara?";
  }

  if (THANKS_INTENTS.has(normalizedQuestion)) {
    return persian
      ? "\u062e\u0648\u0627\u0647\u0634 \u0645\u06cc\u200c\u06a9\u0646\u0645! \u0627\u06af\u0631 \u062f\u0631\u0628\u0627\u0631\u0647\u0654 Liara \u0633\u0624\u0627\u0644 \u062f\u06cc\u06af\u0631\u06cc \u062f\u0627\u0631\u06cc\u062f\u060c \u062f\u0631 \u062e\u062f\u0645\u062a\u0645."
      : "You're welcome! I'm here if you have another question about Liara.";
  }

  if (ACKNOWLEDGEMENT_INTENTS.has(normalizedQuestion)) {
    return persian
      ? "\u0628\u0627\u0634\u0647 \ud83d\ude42 \u0647\u0631 \u0648\u0642\u062a \u0622\u0645\u0627\u062f\u0647\u200c\u0627\u06cc \u0627\u062f\u0627\u0645\u0647 \u0628\u062f\u0647."
      : "Okay — go ahead whenever you're ready.";
  }

  if (META_CONVERSATION_PATTERNS.some((pattern) => pattern.test(normalizedQuestion))) {
    if (!persian) {
      return "Of course — tell me your Liara question whenever you're ready.";
    }

    if (
      normalizedQuestion.includes("\u0647\u0646\u0648\u0632") ||
      normalizedQuestion.includes("\u0633\u0648\u0627\u0644 \u062f\u0627\u0631\u0645")
    ) {
      return "\u062f\u0631\u0633\u062a\u0647 \ud83d\ude04 \u0647\u0631 \u0648\u0642\u062a \u0622\u0645\u0627\u062f\u0647\u200c\u0627\u06cc\u060c \u0628\u06af\u0648 \u0686\u06cc \u0645\u06cc\u200c\u062e\u0648\u0627\u06cc \u062a\u0627 \u06a9\u0645\u06a9\u062a \u06a9\u0646\u0645.";
    }

    if (normalizedQuestion === "\u0635\u0628\u0631 \u06a9\u0646") {
      return "\u062d\u062a\u0645\u0627\u064b\u060c \u0645\u0646\u062a\u0638\u0631\u0645 \ud83d\ude42";
    }

    return "\u062d\u062a\u0645\u0627\u064b \ud83d\ude42 \u0627\u062f\u0627\u0645\u0647 \u0628\u062f\u0647\u061b \u0622\u0645\u0627\u062f\u0647\u200c\u0627\u0645 \u06a9\u0645\u06a9\u062a \u06a9\u0646\u0645.";
  }

  return null;
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

  const recentTerms = request.recentContext?.slice(-2).map((message) => message.content) ?? [];
  return [request.message, ...recentTerms, ...contextTerms].join(" ");
}

export function createGroundedChatService(
  dependencies: GroundedChatDependencies,
): GroundedChatService {
  return Object.freeze({
    requestTimeoutMs: dependencies.aiConfig.requestTimeoutMs,

    async answer(input: GroundedChatInput): Promise<GroundedChatResult> {
      input.signal.throwIfAborted();

      const directAnswer = directConversationAnswer(
        input.request.message,
        input.request.userContext,
      );

      if (directAnswer) {
        return Object.freeze({
          kind: "no_evidence",
          answer: directAnswer,
          citations: Object.freeze([]),
          evidenceStatus: "none",
        });
      }

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
          recentContext: input.request.recentContext,
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
