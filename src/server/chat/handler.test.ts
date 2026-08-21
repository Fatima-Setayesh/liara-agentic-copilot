import type { TextStreamPart, ToolSet } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GroundedChatResult,
  GroundedChatService,
} from "@/server/agent";

import { GroundedChatError } from "@/server/agent";

import { createChatPostHandler } from "./handler";

function request(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function service(
  answer: GroundedChatService["answer"],
): GroundedChatService {
  return { requestTimeoutMs: 45_000, answer };
}

function modelTextStream(text: string): ReadableStream<TextStreamPart<ToolSet>> {
  return new ReadableStream<TextStreamPart<ToolSet>>({
    start(controller) {
      controller.enqueue({ type: "text-start", id: "answer" });
      controller.enqueue({ type: "text-delta", id: "answer", text });
      controller.enqueue({ type: "text-end", id: "answer" });
      controller.close();
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("chat route handler", () => {
  it("returns a safe structured error for invalid input", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = createChatPostHandler({
      getService: () => {
        throw new Error("must not be called");
      },
      generateId: () => "test-id",
    });

    const response = await handler(request({ version: "1", message: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      version: "1",
      error: {
        code: "INVALID_INPUT",
        message: "The chat request is invalid.",
        requestId: "request_test-id",
        retryable: false,
      },
    });
  });

  it("streams an honest no-evidence completion without an application error", async () => {
    const handler = createChatPostHandler({
      getService: () =>
        service(async () => ({
          kind: "no_evidence",
          answer: "No reliable evidence was found.",
          citations: [],
          evidenceStatus: "none",
        })),
      generateId: () => "test-id",
    });

    const response = await handler(
      request({ version: "1", message: "Unknown Liara question" }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request_test-id");
    expect(body).toContain("No reliable evidence was found.");
    expect(body).toContain('"evidenceStatus":"none"');
    expect(body).not.toContain('"type":"data-error"');
  });

  it("streams model text with backend-owned citations and a partial outcome", async () => {
    const result: GroundedChatResult = {
      kind: "stream",
      stream: modelTextStream("Deploy with the documented workflow [1]."),
      citations: [
        {
          id: "citation_chunk_test",
          displayIndex: 1,
          source: {
            id: "chunk_test",
            title: "Deploy Next.js",
            url: "https://docs.liara.ir/paas/nextjs/deploy/",
          },
        },
      ],
      evidenceStatus: "partial",
    };
    const handler = createChatPostHandler({
      getService: () => service(async () => result),
      generateId: () => "test-id",
    });

    const response = await handler(
      request({ version: "1", message: "Deploy Next.js" }),
    );
    const body = await response.text();

    expect(body).toContain("Deploy with the documented workflow [1].");
    expect(body).toContain('"type":"data-citation"');
    expect(body).toContain('"evidenceStatus":"partial"');
    expect(body).not.toContain('"type":"data-error"');
  });

  it("streams a typed retrieval error after headers are committed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = createChatPostHandler({
      getService: () =>
        service(async () => {
          throw new GroundedChatError(new Error("checkout unavailable"));
        }),
      generateId: () => "test-id",
    });

    const response = await handler(
      request({ version: "1", message: "Deploy Next.js" }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"code":"RETRIEVAL_FAILED"');
    expect(body).toContain('"status":"failed"');
    expect(body).not.toContain("checkout unavailable");
  });
});
