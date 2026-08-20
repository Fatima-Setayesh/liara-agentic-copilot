import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AiResponseCard } from "./ai-response-card";
import type { AiResponsePresentation } from "./ai-response-model";
import type { ProjectEvidence } from "./source-experience-model";

import type { Citation } from "@/contracts";

const response: AiResponsePresentation = {
  analysis: "Verified analysis from the response stream.",
  problemDetected: "Verified problem from the response stream.",
  whyThisHappens: "Verified cause from the response stream.",
  recommendedFix: "Verified recommendation from the response stream.",
};

const citation: Citation = {
  id: "citation-authentication",
  displayIndex: 1,
  source: {
    id: "liara-authentication-doc",
    title: "Liara authentication guide",
    url: "https://docs.liara.ir/paas/authentication",
    sectionHeading: "Session configuration",
    documentationPath: "src/pages/paas/authentication.mdx",
    snippet: "Official guidance supplied by the grounded response fixture.",
    serviceCategory: "PaaS",
  },
};

const projectEvidence: ProjectEvidence = {
  summary: "Typed project evidence supplied by the response fixture.",
  configurationReviewed: true,
  technologies: ["Next.js", "TypeScript"],
  files: [
    { id: "auth-file", path: "src/lib/auth.ts", descriptor: "Authentication helper" },
    { id: "next-config", path: "next.config.ts", descriptor: "Next.js configuration" },
  ],
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

  it("shows the premium loading surface before the first token", () => {
    const html = renderToStaticMarkup(
      <AiResponseCard
        prompt="Original prompt"
        timestamp="2026-08-20T12:00:00.000Z"
        citations={[]}
        presentation={response}
        agentState="retrieving"
        lifecycle={{ phase: "loading", progress: 0, activeStep: 2 }}
        onSuggestedPrompt={vi.fn()}
      />,
    );

    expect(html).toContain("Establishing response context");
    expect(html).toContain("Checking official sources");
    expect(html).not.toContain(">Analysis<");
    expect(html).not.toContain("Response actions");
  });

  it("reveals response sections progressively while streaming", () => {
    const html = renderToStaticMarkup(
      <AiResponseCard
        prompt="Original prompt"
        timestamp="2026-08-20T12:00:00.000Z"
        citations={[]}
        presentation={response}
        agentState="generating"
        lifecycle={{ phase: "streaming", progress: .12, activeStep: 4 }}
        onSuggestedPrompt={vi.fn()}
      />,
    );

    expect(html).toContain(">Analysis<");
    expect(html).toContain("Liara is generating the response.");
    expect(html).not.toContain("Problem detected");
    expect(html).not.toContain("Response actions");
  });

  it("renders verified citation and project evidence after completion", () => {
    const html = renderToStaticMarkup(
      <AiResponseCard
        prompt="Original prompt"
        timestamp="2026-08-20T12:00:00.000Z"
        citations={[citation]}
        projectEvidence={projectEvidence}
        presentation={response}
        agentState="completed"
        lifecycle={{ phase: "complete", progress: 1, activeStep: 4 }}
        onSuggestedPrompt={vi.fn()}
      />,
    );

    expect(html).toContain("2 sources used for this response");
    expect(html).toContain("Liara authentication guide");
    expect(html).toContain("Verified official");
    expect(html).toContain("Project context");
    expect(html).toContain("Analyzed locally");
    expect(html).toContain("2 files grounded this response");
    expect(html).toContain("src/lib");
    expect(html).toContain("Official documentation");
    expect(html).toContain("Configuration analysis");
  });

  it("does not fabricate source details when no grounding data is provided", () => {
    const html = renderToStaticMarkup(
      <AiResponseCard
        prompt="Original prompt"
        timestamp="2026-08-20T12:00:00.000Z"
        citations={[]}
        presentation={response}
        agentState="completed"
        lifecycle={{ phase: "complete", progress: 1, activeStep: 4 }}
        onSuggestedPrompt={vi.fn()}
      />,
    );

    expect(html).toContain("0 sources used for this response");
    expect(html).toContain("No grounding data attached");
    expect(html).not.toContain("Verified official");
    expect(html).not.toContain("Analyzed locally");
  });
});
