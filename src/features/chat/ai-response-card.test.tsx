import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AiResponseCard } from "./ai-response-card";
import type { AiResponsePresentation } from "./ai-response-model";

const response: AiResponsePresentation = {
  analysis: "Verified analysis from the response stream.",
  problemDetected: "Verified problem from the response stream.",
  whyThisHappens: "Verified cause from the response stream.",
  recommendedFix: "Verified recommendation from the response stream.",
};

describe("AiResponseCard", () => {
  it("renders injected response data, workflow state, and backend suggestions", () => {
    const html = renderToStaticMarkup(
      <AiResponseCard
        prompt="Original prompt"
        timestamp="2026-08-20T12:00:00.000Z"
        citations={[]}
        presentation={response}
        agentState="retrieving"
        suggestions={[
          { id: "inspect-logs", label: "Inspect build logs", prompt: "Inspect these build logs" },
        ]}
        onSuggestedPrompt={vi.fn()}
      />,
    );

    expect(html).toContain("Verified analysis from the response stream.");
    expect(html).toContain("Searching official Liara sources");
    expect(html).toContain("In progress");
    expect(html).toContain("Inspect build logs");
    expect(html).not.toContain("The chat service has not returned");
  });

  it("renders an honest waiting workflow before any agent event arrives", () => {
    const html = renderToStaticMarkup(
      <AiResponseCard
        prompt="Original prompt"
        timestamp="2026-08-20T12:00:00.000Z"
        citations={[]}
        onSuggestedPrompt={vi.fn()}
      />,
    );

    expect(html).toContain("Waiting for chat service");
    expect(html).toContain("No activity event received");
    expect(html).not.toContain(">Completed<");
  });
});
