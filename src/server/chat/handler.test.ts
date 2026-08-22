import type { TextStreamPart, ToolSet } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GroundedChatResult,
  GroundedChatService,
} from "@/server/agent";

import { GroundedChatError } from "@/server/agent";

import { createChatPostHandler } from "./handler";
import type { ChatHandlerDependencies } from "./handler";
import type { ChatLogEvent } from "./logging";

function request(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(
  body: BodyInit | null,
  contentType = "application/json",
  signal?: AbortSignal,
): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    ...(signal === undefined ? {} : { signal }),
  });
}

function testHandler(dependencies: ChatHandlerDependencies) {
  return createChatPostHandler({
    logger: { write: () => undefined },
    ...dependencies,
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
    const handler = testHandler({
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

  it.each([
    ["wrong content type", rawRequest("{}", "text/plain")],
    ["malformed JSON", rawRequest("{")],
    [
      "oversized body",
      rawRequest(JSON.stringify({ version: "1", message: "x".repeat(17_000) })),
    ],
  ])("rejects %s as safe invalid input", async (_case, invalidRequest) => {
    const handler = testHandler({
      getService: () => {
        throw new Error("must not be called");
      },
      generateId: () => "test-id",
    });

    const response = await handler(invalidRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: { code: "INVALID_INPUT", requestId: "request_test-id" },
    });
  });

  it("returns the existing rate-limit error with a retry header", async () => {
    const handler = testHandler({
      getService: () => {
        throw new Error("must not be called");
      },
      getRateLimiter: () => ({
        check: () => ({ allowed: false, retryAfterMs: 1_500 }),
      }),
      getRateLimitKey: () => "client-key",
      generateId: () => "test-id",
    });

    const response = await handler(
      request({
        version: "1",
        clientRequestId: "request_client",
        message: "Deploy Next.js",
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("2");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "RATE_LIMITED",
        requestId: "request_client",
        retryable: true,
      },
    });
  });

  it("streams an honest no-evidence completion without an application error", async () => {
    const handler = testHandler({
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
    const handler = testHandler({
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
    const handler = testHandler({
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

  it("emits structured lifecycle logs without request content", async () => {
    const events: ChatLogEvent[] = [];
    let currentTime = 1_000;
    const handler = createChatPostHandler({
      getService: () =>
        service(async () => ({
          kind: "no_evidence",
          answer: "No reliable evidence was found.",
          citations: [],
          evidenceStatus: "none",
        })),
      logger: { write: (event) => events.push(event) },
      generateId: () => "test-id",
      now: () => {
        currentTime += 25;
        return currentTime;
      },
    });

    const response = await handler(
      request({ version: "1", message: "private prompt content" }),
    );
    await response.text();

    expect(events).toEqual([
      { event: "chat_request_started", requestId: "request_test-id" },
      {
        event: "chat_request_completed",
        requestId: "request_test-id",
        durationMs: 25,
        outcome: "completed",
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("private prompt content");
  });

  it("maps the overall request timeout to a safe streamed timeout", async () => {
    const handler = testHandler({
      getService: () =>
        ({
          requestTimeoutMs: 10,
          answer: ({ signal }) =>
            new Promise((_resolve, reject) => {
              signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
              });
            }),
        }),
      generateId: () => "test-id",
    });

    const response = await handler(
      request({ version: "1", message: "Deploy Next.js" }),
    );
    const body = await response.text();

    expect(body).toContain('"code":"TIMEOUT"');
    expect(body).not.toContain("TimeoutError");
  });

  it("propagates client cancellation without an application error", async () => {
    const controller = new AbortController();
    const events: ChatLogEvent[] = [];
    const handler = createChatPostHandler({
      getService: () => ({
        requestTimeoutMs: 1_000,
        answer: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            });
          }),
      }),
      logger: { write: (event) => events.push(event) },
      generateId: () => "test-id",
    });
    const response = await handler(
      rawRequest(
        JSON.stringify({ version: "1", message: "Deploy Next.js" }),
        "application/json",
        controller.signal,
      ),
    );

    controller.abort();
    const body = await response.text();

    expect(body).toContain('"status":"cancelled"');
    expect(body).not.toContain('"type":"data-error"');
    expect(events.some((event) => event.event === "chat_request_cancelled")).toBe(true);
  });
});
