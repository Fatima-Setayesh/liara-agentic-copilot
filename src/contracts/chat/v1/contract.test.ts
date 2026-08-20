import { describe, expect, it } from "vitest";

import {
  AGENT_STATES,
  CHAT_ERROR_CODES,
  MAX_CHAT_MESSAGE_CHARACTERS,
  chatRequestSchema,
  citationSchema,
} from "./index";

describe("chat contract v1", () => {
  it("accepts a valid request with optional personalization", () => {
    const result = chatRequestSchema.safeParse({
      version: "1",
      conversationId: "conversation_123",
      clientRequestId: "request_123",
      message: "How do I deploy a Next.js application on Liara?",
      userContext: {
        framework: "Next.js",
        experienceLevel: "intermediate",
        answerDepth: "balanced",
        preferredLanguage: "en",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown request fields and oversized input", () => {
    const unknownField = chatRequestSchema.safeParse({
      version: "1",
      message: "Help me deploy.",
      providerApiKey: "must-never-cross-this-boundary",
    });
    const oversized = chatRequestSchema.safeParse({
      version: "1",
      message: "x".repeat(MAX_CHAT_MESSAGE_CHARACTERS + 1),
    });

    expect(unknownField.success).toBe(false);
    expect(oversized.success).toBe(false);
  });

  it("accepts citations only from the initial official-source allowlist", () => {
    const official = citationSchema.safeParse({
      id: "citation_1",
      displayIndex: 1,
      source: {
        id: "source_1",
        title: "Liara documentation",
        url: "https://docs.liara.ir/",
      },
    });
    const untrusted = citationSchema.safeParse({
      id: "citation_2",
      displayIndex: 2,
      source: {
        id: "source_2",
        title: "Untrusted copy",
        url: "https://example.com/liara-guide",
      },
    });

    expect(official.success).toBe(true);
    expect(untrusted.success).toBe(false);
  });

  it("keeps agent states and safe error codes stable", () => {
    expect(AGENT_STATES).toEqual([
      "understanding",
      "clarification_required",
      "retrieving",
      "generating",
      "completed",
      "failed",
    ]);
    expect(CHAT_ERROR_CODES).toEqual([
      "RATE_LIMITED",
      "INVALID_INPUT",
      "RETRIEVAL_FAILED",
      "MODEL_UNAVAILABLE",
      "STREAM_INTERRUPTED",
      "INTERNAL_ERROR",
    ]);
  });
});
