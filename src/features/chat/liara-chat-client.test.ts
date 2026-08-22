import { afterEach, describe, expect, it, vi } from "vitest";

import { createChatRequestBody, LiaraChatClientError, liaraChatFetch, toSafeChatError } from "./liara-chat-client";

describe("Liara chat client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves a validated structured API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      version: "1",
      error: {
        code: "RATE_LIMITED",
        message: "Please wait before retrying.",
        requestId: "request-123",
        retryable: true,
      },
    }), { status: 429, headers: { "Content-Type": "application/json" } })));

    await expect(liaraChatFetch("/api/chat")).rejects.toBeInstanceOf(LiaraChatClientError);
  });

  it("normalizes unknown failures without exposing internal details", () => {
    const error = toSafeChatError(new Error("private provider stack"), "request-safe");
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.requestId).toBe("request-safe");
    expect(error.message).not.toContain("provider stack");
  });

  it("builds the protected v1 request with bounded recent context", () => {
    expect(createChatRequestBody({
      message: "How should I deploy this app?",
      metadata: { contractVersion: "1", requestId: "request-123", conversationId: "conversation-123" },
      userContext: { framework: "Next.js", answerDepth: "concise" },
      recentContext: [{ role: "user", content: "I use Next.js." }],
    })).toEqual({
      version: "1",
      conversationId: "conversation-123",
      clientRequestId: "request-123",
      message: "How should I deploy this app?",
      recentContext: [{ role: "user", content: "I use Next.js." }],
      userContext: { framework: "Next.js", answerDepth: "concise" },
    });
  });
});
