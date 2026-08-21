import { describe, expect, it } from "vitest";

import { createInMemoryLexicalRetriever } from "./retriever";
import type { DocumentationChunk, RetrievalQuery } from "./types";

function makeChunk(name: string, content: string): DocumentationChunk {
  const repositoryPath = `src/pages/paas/${name}.mdx`;
  const documentId = `document-${name}` as DocumentationChunk["documentId"];

  return {
    chunkId: `chunk-${name}` as DocumentationChunk["chunkId"],
    documentId,
    sectionId: `section-${name}` as NonNullable<
      DocumentationChunk["sectionId"]
    >,
    source: {
      documentId,
      repositoryPath,
      publishedPath: `/paas/${name}/`,
      publishedUrl: `https://docs.liara.ir/paas/${name}/`,
      repositoryUrl: `https://github.com/liara-cloud/docs/blob/revision/${repositoryPath}`,
      revision: "revision" as DocumentationChunk["source"]["revision"],
      pathSegments: Object.freeze(repositoryPath.split("/")),
      contentHash: `hash-${name}` as DocumentationChunk["source"]["contentHash"],
      classification: {
        category: "paas",
        frameworkOrRuntime: "nextjs",
        service: "application-platform",
      },
    },
    title: `${name} deployment guide`,
    sectionHeading: "Deploy application",
    headingPath: Object.freeze(["Deploy application"]),
    anchor: "deploy-application",
    content,
    order: 0,
    estimatedTokens: 20,
  };
}

function makeQuery(overrides: Partial<RetrievalQuery> = {}): RetrievalQuery {
  return {
    text: "deploy next.js",
    limit: 3,
    category: null,
    frameworkOrRuntime: null,
    service: null,
    ...overrides,
  };
}

describe("createInMemoryLexicalRetriever", () => {
  it("returns typed ranked matches while honoring the requested limit", async () => {
    const retriever = createInMemoryLexicalRetriever([
      makeChunk("nextjs", "Deploy a Next.js application with these settings."),
      makeChunk("runtime", "Configure the Next.js runtime before deployment."),
    ]);
    const outcome = await retriever.retrieve(makeQuery({ limit: 1 }), {
      signal: null,
    });

    expect(outcome.kind).toBe("matches");
    expect(outcome.matches).toHaveLength(1);
    expect(outcome.matches[0]?.rank).toBe(1);
    expect(outcome.consideredChunkCount).toBe(2);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.matches)).toBe(true);
  });

  it("distinguishes blank and no-relevance queries from retrieval failure", async () => {
    const retriever = createInMemoryLexicalRetriever([
      makeChunk("nextjs", "Deploy a Next.js application."),
    ]);
    const blank = await retriever.retrieve(makeQuery({ text: "" }), {
      signal: null,
    });
    const unrelated = await retriever.retrieve(
      makeQuery({ text: "quantum-entanglement" }),
      { signal: null },
    );

    expect(blank).toEqual({
      kind: "no_matches",
      matches: [],
      consideredChunkCount: 0,
    });
    expect(unrelated).toEqual({
      kind: "no_matches",
      matches: [],
      consideredChunkCount: 1,
    });
  });

  it("returns no matches when an explicit filter excludes the corpus", async () => {
    const retriever = createInMemoryLexicalRetriever([
      makeChunk("nextjs", "Deploy a Next.js application."),
    ]);
    const outcome = await retriever.retrieve(
      makeQuery({ category: "dbaas" }),
      { signal: null },
    );

    expect(outcome.kind).toBe("no_matches");
    expect(outcome.consideredChunkCount).toBe(0);
  });

  it("propagates cancellation before retrieval", async () => {
    const controller = new AbortController();
    const retriever = createInMemoryLexicalRetriever([
      makeChunk("nextjs", "Deploy a Next.js application."),
    ]);
    controller.abort();

    await expect(
      retriever.retrieve(makeQuery(), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("accepts cancellation queued after retrieval is invoked", async () => {
    const controller = new AbortController();
    const retriever = createInMemoryLexicalRetriever([
      makeChunk("nextjs", "Deploy a Next.js application."),
    ]);

    const pending = retriever.retrieve(makeQuery(), {
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("treats invalid non-positive limits as an empty bounded result", async () => {
    const retriever = createInMemoryLexicalRetriever([
      makeChunk("nextjs", "Deploy a Next.js application."),
    ]);
    const outcome = await retriever.retrieve(makeQuery({ limit: 0 }), {
      signal: null,
    });

    expect(outcome.kind).toBe("no_matches");
    expect(outcome.matches).toEqual([]);
    expect(outcome.consideredChunkCount).toBe(0);
  });
});
