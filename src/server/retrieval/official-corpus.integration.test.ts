import { describe, expect, it } from "vitest";

import { DEFAULT_CHUNK_MAX_CHARACTERS } from "./chunk";
import { buildDocumentationCorpus } from "./corpus";
import { createInMemoryLexicalRetriever } from "./retriever";

const repositoryRoot = process.env.LIARA_DOCS_REPOSITORY_PATH;
const revision = process.env.LIARA_DOCS_REVISION;
const AUDITED_REVISION = "31f2ef7adce565341d7eba43492ef5b4f63a7d73";
const hasOfficialCheckout = Boolean(repositoryRoot && revision);

describe.runIf(hasOfficialCheckout)("official Liara documentation corpus", () => {
  it("normalizes the pinned source corpus without losing audited evidence", async () => {
    if (!repositoryRoot || !revision) {
      throw new Error("Official corpus environment is incomplete");
    }
    expect(revision).toBe(AUDITED_REVISION);

    const corpus = await buildDocumentationCorpus({ repositoryRoot, revision });

    expect(corpus.loadedFileCount).toBe(1_142);
    expect(corpus.documents).toHaveLength(1_141);
    expect(corpus.chunks.length).toBeGreaterThan(corpus.documents.length);
    expect(
      corpus.chunks.every(
        (chunk) => chunk.content.length <= DEFAULT_CHUNK_MAX_CHARACTERS,
      ),
    ).toBe(true);
    expect(corpus.skippedFiles).toEqual([
      {
        repositoryPath:
          "src/pages/ai/ai-sdk-errors/ai-api-call-error.mdx",
        reason: "empty_source",
      },
    ]);
    const diagnosticSummary = Object.fromEntries(
      Array.from(
        corpus.documents
          .flatMap((document) => document.diagnostics)
          .reduce(
            (counts, diagnostic) =>
              counts.set(diagnostic.code, (counts.get(diagnostic.code) ?? 0) + 1),
            new Map<string, number>(),
          ),
      ),
    );
    expect(diagnosticSummary).toEqual({
      dynamic_map_callback_ignored: 283,
      unsupported_dynamic_expression: 98,
    });
    expect(
      corpus.documents.every(
        (document) =>
          document.source.publishedUrl.startsWith("https://docs.liara.ir/") &&
          document.source.publishedUrl.endsWith("/") &&
          document.source.repositoryUrl.includes(`/blob/${revision}/`),
      ),
    ).toBe(true);

    const cliDeploy = corpus.documents.find(
      (document) =>
        document.source.repositoryPath ===
        "src/pages/references/cli/deploy-app.mdx",
    );
    const postgresNext = corpus.documents.find(
      (document) =>
        document.source.repositoryPath ===
        "src/pages/dbaas/postgresql/how-tos/connect-via-platform/nextjs.mdx",
    );
    const cliContent = cliDeploy?.sections
      .flatMap((section) => section.blocks)
      .map((block) => block.text)
      .join("\n");
    const postgresContent = postgresNext?.sections
      .flatMap((section) => section.blocks)
      .map((block) => block.text)
      .join("\n");

    expect(cliContent).toContain("liara deploy --app=my-web-app");
    expect(postgresContent).toContain("@/lib/postgresql");

    const retriever = createInMemoryLexicalRetriever(corpus.chunks);
    const cliOutcome = await retriever.retrieve(
      {
        text: "استقرار برنامه با Liara CLI",
        limit: 5,
        category: "references",
        frameworkOrRuntime: null,
        service: null,
      },
      { signal: null },
    );
    const missingOutcome = await retriever.retrieve(
      {
        text: "zzqvortexcryptonine",
        limit: 5,
        category: null,
        frameworkOrRuntime: null,
        service: null,
      },
      { signal: null },
    );

    expect(cliOutcome.kind).toBe("matches");
    expect(
      cliOutcome.matches.some(
        (match) =>
          match.chunk.source.repositoryPath ===
          "src/pages/references/cli/deploy-app.mdx",
      ),
    ).toBe(true);
    expect(missingOutcome.kind).toBe("no_matches");
  }, 120_000);
});
