import { describe, expect, it } from "vitest";

import type { Citation } from "@/contracts";

import { createSourceItems, type ProjectEvidence } from "./source-experience-model";

const officialCitation: Citation = {
  id: "citation-1",
  displayIndex: 1,
  source: {
    id: "source-1",
    title: "Official source",
    url: "https://docs.liara.ir/paas/nextjs",
    sectionHeading: "Deploy an application",
  },
};

describe("source experience model", () => {
  it("derives presentation labels only from supplied official citation data", () => {
    const [source] = createSourceItems([officialCitation]);

    expect(source).toMatchObject({
      kind: "official-docs",
      title: "Official source",
      descriptor: "Deploy an application",
      trustLabel: "Verified official",
    });
  });

  it("adds project context only when analyzed files are explicitly supplied", () => {
    const emptyEvidence: ProjectEvidence = { files: [], technologies: ["Next.js"] };
    const groundedEvidence: ProjectEvidence = {
      files: [{ id: "config", path: "next.config.ts" }],
      technologies: ["Next.js"],
    };

    expect(createSourceItems([], emptyEvidence)).toEqual([]);
    expect(createSourceItems([], groundedEvidence)).toEqual([
      expect.objectContaining({
        kind: "project-context",
        descriptor: "1 analyzed file",
      }),
    ]);
  });
});
