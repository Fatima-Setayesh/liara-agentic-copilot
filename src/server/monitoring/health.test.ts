import { describe, expect, it, vi } from "vitest";

import { checkApplicationHealth } from "./health";

describe("application health", () => {
  it("reports ready configuration without invoking external services", () => {
    const checkAIConfiguration = vi.fn();
    const checkChatConfiguration = vi.fn();
    const checkRetrievalConfiguration = vi.fn();

    expect(
      checkApplicationHealth({
        checkAIConfiguration,
        checkChatConfiguration,
        checkRetrievalConfiguration,
      }),
    ).toEqual({
      status: "ok",
      checks: {
        aiConfiguration: "ok",
        chatConfiguration: "ok",
        retrievalConfiguration: "ok",
      },
    });
    expect(checkAIConfiguration).toHaveBeenCalledOnce();
    expect(checkChatConfiguration).toHaveBeenCalledOnce();
    expect(checkRetrievalConfiguration).toHaveBeenCalledOnce();
  });

  it("reports degraded configuration without exposing error details", () => {
    const health = checkApplicationHealth({
      checkAIConfiguration: () => {
        throw new Error("secret provider detail");
      },
      checkChatConfiguration: () => undefined,
      checkRetrievalConfiguration: () => undefined,
    });

    expect(health).toEqual({
      status: "degraded",
      checks: {
        aiConfiguration: "error",
        chatConfiguration: "ok",
        retrievalConfiguration: "ok",
      },
    });
    expect(JSON.stringify(health)).not.toContain("secret provider detail");
  });
});
