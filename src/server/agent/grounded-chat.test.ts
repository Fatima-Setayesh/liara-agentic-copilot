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
