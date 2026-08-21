import { describe, expect, it } from "vitest";

import {
  createPendingPresentation,
  formatPresentationCopy,
  getAgentStatusSteps,
  type AiResponsePresentation,
} from "./ai-response-model";

describe("AI response presentation model", () => {
  it("serializes the submitted prompt into a valid request example", () => {
    const prompt = "Why did \"deploy\" fail?\nShow the relevant logs.";
    const presentation = createPendingPresentation(prompt);
    const code = presentation.codeExample?.lines
      .map((line) => line.tokens.map((token) => token.text).join(""))
      .join("\n");

    expect(code).toBeDefined();
    expect(JSON.parse(code ?? "{}")).toEqual({
      version: "1",
      message: prompt,
      userContext: { answerDepth: "detailed" },
    });
  });

  it("copies the rendered structured response instead of placeholder text", () => {
    const response: AiResponsePresentation = {
      analysis: "Verified analysis",
      problemDetected: "Verified problem",
      whyThisHappens: "Verified cause",
      recommendedFix: "Verified fix",
    };

    expect(formatPresentationCopy(response)).toBe(
      "Analysis\nVerified analysis\n\n" +
        "Problem detected\nVerified problem\n\n" +
        "Why this happens\nVerified cause\n\n" +
        "Recommended fix\nVerified fix",
    );
  });
});

describe("agent status presentation", () => {
  it("does not claim work was completed before a stream event arrives", () => {
    const steps = getAgentStatusSteps();

    expect(steps[0]).toMatchObject({ state: "waiting" });
    expect(steps.some((step) => step.state === "complete")).toBe(false);
  });

  it("maps retrieval to one user-facing active step", () => {
    const steps = getAgentStatusSteps("retrieving");

    expect(steps.filter((step) => step.state === "working")).toEqual([
      expect.objectContaining({ label: "Searching official Liara sources" }),
    ]);
  });

  it("marks every public step complete only after the completed event", () => {
    const steps = getAgentStatusSteps(undefined, "completed");

    expect(steps).toHaveLength(4);
    expect(steps.every((step) => step.state === "complete")).toBe(true);
  });
});
