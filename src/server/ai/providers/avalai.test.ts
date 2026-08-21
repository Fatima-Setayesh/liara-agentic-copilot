import { generateText } from "ai";
import { describe, expect, it, vi } from "vitest";

import { createAvalAIProvider } from "./avalai";

describe("AvalAI provider", () => {
  it("creates an OpenAI-compatible chat model without exposing the API key", () => {
    const provider = createAvalAIProvider({
      provider: "avalai",
      apiKey: "aa-secret-test-key",
      baseUrl: "https://api.avalai.ir/v1",
      modelId: "test-model",
      requestTimeoutMs: 45_000,
      maxOutputTokens: 1_200,
      retrievalLimit: 6,
    });

    expect(provider.providerId).toBe("avalai");
    expect(provider.modelId).toBe("test-model");
    expect(typeof provider.model).not.toBe("string");
    if (typeof provider.model !== "string") {
      expect(provider.model.modelId).toBe("test-model");
    }
    expect(JSON.stringify(provider)).not.toContain("aa-secret-test-key");
  });

  it("uses AvalAI's OpenAI-compatible chat endpoint and bearer authentication", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          id: "chatcmpl_test",
          object: "chat.completion",
          created: 0,
          model: "test-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "grounded answer" },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 2,
            total_tokens: 7,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = createAvalAIProvider(
      {
        provider: "avalai",
        apiKey: "aa-secret-test-key",
        baseUrl: "https://api.avalai.ir/v1",
        modelId: "test-model",
        requestTimeoutMs: 45_000,
        maxOutputTokens: 1_200,
        retrievalLimit: 6,
      },
      { fetch: fetchMock },
    );

    const result = await generateText({
      model: provider.model,
      prompt: "test",
      maxRetries: 0,
    });

    expect(result.text).toBe("grounded answer");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.avalai.ir/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer aa-secret-test-key",
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "test-model",
    });
  });
});
