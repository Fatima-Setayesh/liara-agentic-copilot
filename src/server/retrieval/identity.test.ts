import { describe, expect, it } from "vitest";

import {
  createDocumentationChunkId,
  createDocumentationContentHash,
  createDocumentationDocumentId,
  createDocumentationSectionId,
  parseDocumentationRevision,
} from "./identity";

describe("retrieval identity", () => {
  it("creates deterministic content and document identities", () => {
    expect(createDocumentationContentHash("official evidence")).toMatch(
      /^[a-f0-9]{64}$/u,
    );
    expect(createDocumentationDocumentId("src/pages/paas/nodejs/a.mdx")).toBe(
      createDocumentationDocumentId("src/pages/paas/nodejs/a.mdx"),
    );
  });

  it("keeps untrusted heading boundaries unambiguous", () => {
    const documentId = createDocumentationDocumentId(
      "src/pages/paas/nodejs/a.mdx",
    );
    const embeddedSeparator = createDocumentationSectionId(
      documentId,
      ["first\u001fsecond"],
      null,
      0,
    );
    const twoHeadings = createDocumentationSectionId(
      documentId,
      ["first", "second"],
      null,
      0,
    );

    expect(embeddedSeparator).not.toBe(twoHeadings);
  });

  it("binds chunk identity to content and validates full revisions", () => {
    const documentId = createDocumentationDocumentId(
      "src/pages/paas/nodejs/a.mdx",
    );
    const sectionId = createDocumentationSectionId(
      documentId,
      ["deploy"],
      "deploy",
      0,
    );

    expect(
      createDocumentationChunkId(documentId, sectionId, 0, "first"),
    ).not.toBe(createDocumentationChunkId(documentId, sectionId, 0, "second"));
    expect(
      parseDocumentationRevision("A".repeat(40)),
    ).toBe("a".repeat(40));
    expect(() => parseDocumentationRevision("main")).toThrow(TypeError);
  });
});
