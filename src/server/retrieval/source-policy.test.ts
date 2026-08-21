import { describe, expect, it } from "vitest";

import {
  createDocumentationContentHash,
  parseDocumentationRevision,
} from "./identity";
import {
  createDocumentationSource,
  DocumentationSourcePolicyError,
} from "./source-policy";
import type {
  DocumentationContentHash,
  DocumentationRevision,
  LoadedDocumentationFile,
} from "./types";

const REVISION = "31f2ef7adce565341d7eba43492ef5b4f63a7d73";

function loadedFile(
  repositoryPath: string,
  rawMdx = "# Documentation\n",
): LoadedDocumentationFile {
  return {
    repositoryPath,
    rawMdx,
    revision: parseDocumentationRevision(REVISION),
    contentHash: createDocumentationContentHash(rawMdx),
  };
}

describe("documentation source policy", () => {
  it("maps an MDX source to canonical and revision-pinned URLs", () => {
    const source = createDocumentationSource(
      loadedFile("src/pages/paas/nodejs/how-tos/deploy-app.mdx"),
    );

    expect(source).toMatchObject({
      repositoryPath: "src/pages/paas/nodejs/how-tos/deploy-app.mdx",
      publishedPath: "/paas/nodejs/how-tos/deploy-app/",
      publishedUrl:
        "https://docs.liara.ir/paas/nodejs/how-tos/deploy-app/",
      repositoryUrl:
        `https://github.com/liara-cloud/docs/blob/${REVISION}/src/pages/paas/nodejs/how-tos/deploy-app.mdx`,
      revision: REVISION,
      pathSegments: ["paas", "nodejs", "how-tos", "deploy-app"],
      classification: {
        category: "paas",
        frameworkOrRuntime: "nodejs",
        service: null,
      },
    });
    expect(source.documentId).toMatch(/^doc_[a-f0-9]{24}$/);
  });

  it.each([
    {
      path: "src/pages/paas/details/logs.mdx",
      expected: {
        category: "paas",
        frameworkOrRuntime: null,
        service: null,
      },
    },
    {
      path: "src/pages/dbaas/postgresql/quick-setup.mdx",
      expected: {
        category: "dbaas",
        frameworkOrRuntime: null,
        service: "postgresql",
      },
    },
    {
      path: "src/pages/one-click-apps/wordpress/quick-start.mdx",
      expected: {
        category: "one-click-apps",
        frameworkOrRuntime: null,
        service: "wordpress",
      },
    },
    {
      path: "src/pages/one-click-apps/about.mdx",
      expected: {
        category: "one-click-apps",
        frameworkOrRuntime: null,
        service: null,
      },
    },
    {
      path: "src/pages/ai/foundations/streaming.mdx",
      expected: {
        category: "ai",
        frameworkOrRuntime: null,
        service: null,
      },
    },
  ])("classifies $path conservatively", ({ path, expected }) => {
    expect(createDocumentationSource(loadedFile(path)).classification).toEqual(
      expected,
    );
  });

  it.each([
    "public/llms/paas/nodejs/deploy-app.md",
    "/src/pages/paas/nodejs/deploy-app.mdx",
    "src\\pages\\paas\\nodejs\\deploy-app.mdx",
    "src/pages/paas/nodejs/../secret.mdx",
    "src/pages/paas/nodejs/deploy-app.md",
  ])("rejects the non-corpus or unsafe path %s", (repositoryPath) => {
    expect(() => createDocumentationSource(loadedFile(repositoryPath))).toThrow(
      expect.objectContaining({
        name: "DocumentationSourcePolicyError",
        code: "INVALID_REPOSITORY_PATH",
      }),
    );
  });

  it("rejects categories outside the explicit official allowlist", () => {
    expect(() =>
      createDocumentationSource(loadedFile("src/pages/billing/about.mdx")),
    ).toThrow(
      expect.objectContaining({
        code: "UNSUPPORTED_CATEGORY",
      }),
    );
  });

  it("rejects invalid revisions and hashes at the source boundary", () => {
    const valid = loadedFile("src/pages/paas/nodejs/about.mdx");
    const invalidRevision: LoadedDocumentationFile = {
      ...valid,
      revision: "master" as DocumentationRevision,
    };
    const invalidHash: LoadedDocumentationFile = {
      ...valid,
      contentHash: "not-a-hash" as DocumentationContentHash,
    };

    expect(() => createDocumentationSource(invalidRevision)).toThrow(
      expect.objectContaining({ code: "INVALID_REVISION" }),
    );
    expect(() => createDocumentationSource(invalidHash)).toThrow(
      expect.objectContaining({ code: "INVALID_CONTENT_HASH" }),
    );
  });

  it("detects source content that does not match its recorded digest", () => {
    const file = loadedFile("src/pages/paas/nodejs/about.mdx");

    expect(() =>
      createDocumentationSource({
        ...file,
        rawMdx: "# Tampered documentation\n",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CONTENT_HASH_MISMATCH",
      }),
    );
  });

  it("keeps document identity path-stable across source revisions", () => {
    const first = loadedFile("src/pages/references/cli/deploy-app.mdx", "# A\n");
    const secondRawMdx = "# B\n";
    const second: LoadedDocumentationFile = {
      repositoryPath: first.repositoryPath,
      revision: parseDocumentationRevision("b".repeat(40)),
      rawMdx: secondRawMdx,
      contentHash: createDocumentationContentHash(secondRawMdx),
    };

    expect(createDocumentationSource(first).documentId).toBe(
      createDocumentationSource(second).documentId,
    );
  });

  it("exposes typed source-policy errors", () => {
    try {
      createDocumentationSource(loadedFile("src/pages/unknown/about.mdx"));
      throw new Error("Expected source-policy validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentationSourcePolicyError);
    }
  });
});
