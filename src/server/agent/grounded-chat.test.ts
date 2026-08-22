import type { LanguageModel } from "ai";
import { describe, expect, it, vi } from "vitest";

import type { AIConfig, AIProvider } from "@/server/ai";
import type { Retriever } from "@/server/retrieval";

import {
  GroundedChatError,
  createGroundedChatService,
} from "./grounded-chat";

const aiConfig: AIConfig = {
  provider: "avalai",
  apiKey: "aa-test",
  baseUrl: "https://api.avalai.ir/v1",
  modelId: "test-model",
  requestTimeoutMs: 45_000,
  maxOutputTokens: 1_200,
  retrievalLimit: 6,
};

const unusedProvider: AIProvider = {
  providerId: "avalai",
  modelId: "test-model",
  model: null as unknown as LanguageModel,
};

describe("grounded chat service", () => {
  it.each([
    { message: "hello", expected: "Hello" },
    { message: "\u0633\u0644\u0627\u0645!", expected: "Liara" },
    { message: "\u0645\u0645\u0646\u0648\u0646", expected: "Liara" },
    { message: "\u0633\u0644\u0627\u0645 \u062e\u0648\u0628\u06cc \u0645\u06cc\u062a\u0648\u0646\u06cc \u06a9\u0645\u06a9\u0645 \u06a9\u0646\u06cc\u061f\u061f", expected: "Liara" },
    { message: "\u0647\u0646\u0648\u0632 \u0646\u06af\u0641\u062a\u0645 \u0686\u06cc \u0645\u06cc\u062e\u0648\u0627\u0645 \u06a9\u0647", expected: "\u0622\u0645\u0627\u062f\u0647" },
    { message: "\u062e\u0648\u0628\u06cc\u061f", expected: "Liara" },
    { message: "\u0628\u0627\u0634\u0647", expected: "\u0622\u0645\u0627\u062f\u0647" },
    { message: "\u0641\u0639\u0644\u0627 \u0641\u0642\u0637 \u06cc\u0647 \u0633\u0648\u0627\u0644 \u062f\u0627\u0631\u0645", expected: "\u0622\u0645\u0627\u062f\u0647" },
    { message: "I haven't asked my question yet", expected: "Liara" },
  ])(
    "answers the conversational intent '$message' without retrieval or a model call",
    async ({ message, expected }) => {
      const getRetriever = vi.fn(async (): Promise<Retriever> => {
        throw new Error("retrieval must not run for a simple conversation intent");
      });
      const service = createGroundedChatService({
        aiConfig,
        aiProvider: unusedProvider,
        getRetriever,
      });

      const result = await service.answer({
        request: { version: "1", message },
        signal: new AbortController().signal,
      });

      expect(result).toMatchObject({
        kind: "no_evidence",
        evidenceStatus: "none",
        citations: [],
      });
      if (result.kind === "no_evidence") {
        expect(result.answer).toContain(expected);
      }
      expect(getRetriever).not.toHaveBeenCalled();
    },
  );

  it.each([
    "\u0633\u0644\u0627\u0645\u060c \u0686\u0637\u0648\u0631 Next.js \u0631\u0648 \u0631\u0648\u06cc Liara deploy \u06a9\u0646\u0645\u061f",
    "\u0645\u0645\u0646\u0648\u0646\u060c \u062d\u0627\u0644\u0627 env variables \u0631\u0648 \u0686\u0637\u0648\u0631 \u062a\u0646\u0638\u06cc\u0645 \u06a9\u0646\u0645\u061f",
    "\u0627\u0648\u06a9\u06cc\u060c \u0645\u0631\u062d\u0644\u0647 \u0628\u0639\u062f deploy \u0686\u06cc\u0647\u061f",
  ])("keeps technical requests on the retrieval path: %s", async (message) => {
    const retrieve = vi.fn(async () => ({
      kind: "no_matches" as const,
      matches: [] as const,
      consideredChunkCount: 12,
    }));
    const service = createGroundedChatService({
      aiConfig,
      aiProvider: unusedProvider,
      getRetriever: async () => ({ retrieve }),
    });

    await service.answer({
      request: { version: "1", message },
      signal: new AbortController().signal,
    });

    expect(retrieve).toHaveBeenCalledOnce();
  });

  it("returns an honest completed no-evidence answer without calling a model", async () => {
    const retriever: Retriever = {
      async retrieve() {
        return {
          kind: "no_matches",
          matches: [],
          consideredChunkCount: 12,
        };
      },
    };
    const service = createGroundedChatService({
      aiConfig,
      aiProvider: unusedProvider,
      getRetriever: async () => retriever,
    });

    const result = await service.answer({
      request: {
        version: "1",
        message: "چطور سرویس ناشناخته را راه‌اندازی کنم؟",
      },
      signal: new AbortController().signal,
    });

    expect(result).toMatchObject({
      kind: "no_evidence",
      evidenceStatus: "none",
      citations: [],
    });
    if (result.kind === "no_evidence") {
      expect(result.answer).toContain("شواهد کافی");
    }
  });

  it("normalizes retrieval failures separately from no evidence", async () => {
    const service = createGroundedChatService({
      aiConfig,
      aiProvider: unusedProvider,
      getRetriever: async () => {
        throw new Error("checkout unavailable");
      },
    });

    await expect(
      service.answer({
        request: { version: "1", message: "Deploy Next.js" },
        signal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(GroundedChatError);
  });
});
