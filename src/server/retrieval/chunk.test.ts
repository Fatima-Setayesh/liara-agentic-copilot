import { describe, expect, it } from "vitest";

import {
  createDocumentationContentHash,
  parseDocumentationRevision,
} from "./identity";
import { normalizeDocumentationFile } from "./normalize";
import { chunkDocumentationDocument } from "./chunk";
import type { LoadedDocumentationFile, NormalizedDocument } from "./types";

function normalizedFixture(rawMdx: string): NormalizedDocument {
  const file: LoadedDocumentationFile = {
    repositoryPath: "src/pages/paas/nodejs/getting-started.mdx",
    revision: parseDocumentationRevision(
      "31f2ef7adce565341d7eba43492ef5b4f63a7d73",
    ),
    contentHash: createDocumentationContentHash(rawMdx),
    rawMdx,
  };
  const result = normalizeDocumentationFile(file);
  if (result.kind !== "document") throw new Error("Fixture did not normalize");
  return result.document;
}

describe("chunkDocumentationDocument", () => {
  it("keeps section and source identity on paragraph-aware chunks", () => {
    const paragraph = "این یک پاراگراف مستند و قابل استناد است. ".repeat(10);
    const document = normalizedFixture(`# راهنما\n\n${paragraph}\n\n${paragraph}`);
    const chunks = chunkDocumentationDocument(document, {
      maxCharacters: 300,
      overlapCharacters: 60,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.order)).toEqual(
      chunks.map((_, index) => index),
    );
    expect(new Set(chunks.map((chunk) => chunk.chunkId)).size).toBe(chunks.length);
    expect(chunks.every((chunk) => chunk.source === document.source)).toBe(true);
    expect(chunks.every((chunk) => chunk.sectionId !== null)).toBe(true);
    expect(chunks.every((chunk) => chunk.estimatedTokens > 0)).toBe(true);
  });

  it("splits oversized code without exceeding the hard chunk bound", () => {
    const code = `const value = "${"x".repeat(500)}";`;
    const document = normalizedFixture(
      `# راهنما\n\n<Highlight language="js">{\`${code}\`}</Highlight>`,
    );
    const chunks = chunkDocumentationDocument(document, {
      maxCharacters: 200,
      overlapCharacters: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= 200)).toBe(true);
    expect(chunks.every((chunk) => chunk.content.startsWith("```js"))).toBe(true);
    const reconstructed = chunks
      .map((chunk) => chunk.content.replace(/^```js\n/u, "").replace(/\n```$/u, ""))
      .join("");
    expect(reconstructed).toBe(code);
  });

  it("never overlaps code into a later chunk", () => {
    const document = normalizedFixture(`# راهنما

<Highlight language="bash">{\`liara deploy\`}</Highlight>

${"متن بعدی ".repeat(80)}`);
    const chunks = chunkDocumentationDocument(document, {
      maxCharacters: 220,
      overlapCharacters: 60,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.filter((chunk) => chunk.content.includes("liara deploy"))).toHaveLength(
      1,
    );
    expect(chunks.every((chunk) => chunk.content.length <= 220)).toBe(true);
  });

  it("rejects unsafe chunk budgets", () => {
    const document = normalizedFixture("# راهنما\n\nمتن");
    expect(() =>
      chunkDocumentationDocument(document, { maxCharacters: 100 }),
    ).toThrow(RangeError);
    expect(() =>
      chunkDocumentationDocument(document, {
        maxCharacters: 300,
        overlapCharacters: 300,
      }),
    ).toThrow(RangeError);
  });
});
