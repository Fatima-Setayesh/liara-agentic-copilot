import { describe, expect, it } from "vitest";

import { createLexicalRanker } from "./rank";
import type {
  DocumentationCategory,
  DocumentationChunk,
  RetrievalQuery,
} from "./types";

interface ChunkFixtureOptions {
  readonly content?: string;
  readonly title?: string;
  readonly sectionHeading?: string | null;
  readonly sectionId?: string | null;
  readonly documentId?: string;
  readonly repositoryPath?: string;
  readonly category?: DocumentationCategory;
  readonly frameworkOrRuntime?: string | null;
  readonly service?: string | null;
  readonly order?: number;
}

function makeChunk(
  chunkName: string,
  options: ChunkFixtureOptions = {},
): DocumentationChunk {
  const documentName = options.documentId ?? `document-${chunkName}`;
  const repositoryPath =
    options.repositoryPath ?? `src/pages/paas/${chunkName}.mdx`;

  return {
    chunkId: `chunk-${chunkName}` as DocumentationChunk["chunkId"],
    documentId: documentName as DocumentationChunk["documentId"],
    sectionId:
      options.sectionId === null
        ? null
        : ((options.sectionId ?? `section-${chunkName}`) as NonNullable<
            DocumentationChunk["sectionId"]
          >),
    source: {
      documentId: documentName as DocumentationChunk["documentId"],
      repositoryPath,
      publishedPath: repositoryPath
        .replace(/^src\/pages/u, "")
        .replace(/\.mdx$/u, "/"),
      publishedUrl: `https://docs.liara.ir/${chunkName}/`,
      repositoryUrl: `https://github.com/liara-cloud/docs/blob/revision/${repositoryPath}`,
      revision: "revision" as DocumentationChunk["source"]["revision"],
      pathSegments: Object.freeze(repositoryPath.split("/")),
      contentHash: `hash-${chunkName}` as DocumentationChunk["source"]["contentHash"],
      classification: {
        category: options.category ?? "paas",
        frameworkOrRuntime: options.frameworkOrRuntime ?? null,
        service: options.service ?? null,
      },
    },
    title: options.title ?? "Liara documentation guide",
    sectionHeading: options.sectionHeading ?? null,
    headingPath:
      options.sectionHeading === undefined || options.sectionHeading === null
        ? Object.freeze([])
        : Object.freeze([options.sectionHeading]),
    anchor: null,
    content: options.content ?? "General platform documentation.",
    order: options.order ?? 0,
    estimatedTokens: 20,
  };
}

function makeQuery(overrides: Partial<RetrievalQuery> = {}): RetrievalQuery {
  return {
    text: "deploy next.js",
    limit: 5,
    category: null,
    frameworkOrRuntime: null,
    service: null,
    ...overrides,
  };
}

describe("createLexicalRanker", () => {
  it("uses title and heading evidence to rank focused chunks above body-only matches", () => {
    const titleMatch = makeChunk("focused", {
      title: "Deploy Next.js",
      sectionHeading: "Next.js deployment",
      content: "Choose the documented platform settings.",
    });
    const bodyMatch = makeChunk("body", {
      title: "Application platform",
      content: "This page mentions how to deploy Next.js applications.",
    });
    const result = createLexicalRanker([bodyMatch, titleMatch]).rank(
      makeQuery(),
      null,
    );

    expect(result.matches.map((match) => match.chunk.chunkId)).toEqual([
      titleMatch.chunkId,
      bodyMatch.chunkId,
    ]);
    expect(result.matches[0]?.score).toBeGreaterThan(
      result.matches[1]?.score ?? Number.POSITIVE_INFINITY,
    );
    expect(result.matches[0]?.matchedTerms).toEqual([
      "deploy",
      "deployment",
      "next.js",
      "next",
      "js",
      "nextjs",
    ]);
  });

  it("applies category and normalized framework/service filters before ranking", () => {
    const node = makeChunk("node", {
      content: "Deployment configuration and runtime settings.",
      frameworkOrRuntime: "nodejs",
      service: "application-platform",
    });
    const postgres = makeChunk("postgres", {
      category: "dbaas",
      content: "Deployment configuration and database settings.",
      frameworkOrRuntime: "nodejs",
      service: "postgresql",
    });
    const result = createLexicalRanker([node, postgres]).rank(
      makeQuery({
        text: "deployment settings",
        category: "dbaas",
        frameworkOrRuntime: "Node.js",
        service: "PostgreSQL",
      }),
      null,
    );

    expect(result.consideredChunkCount).toBe(1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.chunk.chunkId).toBe(postgres.chunkId);
  });

  it("uses repository path and chunk order as stable tie breakers", () => {
    const laterPath = makeChunk("later", {
      repositoryPath: "src/pages/paas/z-guide.mdx",
      content: "alpha deployment beta",
    });
    const earlierPath = makeChunk("earlier", {
      repositoryPath: "src/pages/paas/a-guide.mdx",
      content: "deployment beta alpha",
    });
    const ranker = createLexicalRanker([laterPath, earlierPath]);
    const query = makeQuery({ text: "alpha beta" });

    const first = ranker.rank(query, null);
    const second = ranker.rank(query, null);

    expect(first).toEqual(second);
    expect(first.matches.map((match) => match.chunk.chunkId)).toEqual([
      earlierPath.chunkId,
      laterPath.chunkId,
    ]);
  });

  it("suppresses exact and conservative near duplicates across documents", () => {
    const commonTokens = Array.from(
      { length: 24 },
      (_, index) => `token${index}`,
    );
    const exactFirst = makeChunk("exact-a", {
      content: "deploy troubleshoot application safely",
      repositoryPath: "src/pages/paas/a.mdx",
    });
    const exactSecond = makeChunk("exact-b", {
      content: "deploy troubleshoot application safely",
      repositoryPath: "src/pages/paas/b.mdx",
    });
    const nearFirst = makeChunk("near-a", {
      content: `deploy troubleshoot ${commonTokens.join(" ")}`,
      repositoryPath: "src/pages/paas/c.mdx",
    });
    const nearSecond = makeChunk("near-b", {
      content: `${commonTokens.toReversed().join(" ")} deploy troubleshoot`,
      repositoryPath: "src/pages/paas/d.mdx",
    });
    const result = createLexicalRanker([
      exactSecond,
      nearSecond,
      exactFirst,
      nearFirst,
    ]).rank(makeQuery({ text: "deploy troubleshoot", limit: 10 }), null);

    expect(result.matches).toHaveLength(2);
    expect(
      result.matches.filter((match) =>
        match.chunk.content.includes("application safely"),
      ),
    ).toHaveLength(1);
    expect(
      result.matches.filter((match) =>
        match.chunk.content.includes("token0"),
      ),
    ).toHaveLength(1);
  });

  it("keeps similar content from distinct sections of the same document", () => {
    const first = makeChunk("section-a", {
      documentId: "shared-document",
      sectionId: "section-a",
      content: "deploy application safely",
      order: 0,
    });
    const second = makeChunk("section-b", {
      documentId: "shared-document",
      sectionId: "section-b",
      content: "deploy application safely",
      order: 1,
    });
    const result = createLexicalRanker([first, second]).rank(
      makeQuery({ text: "deploy application" }),
      null,
    );

    expect(result.matches).toHaveLength(2);
  });

  it("rejects blank, unrelated, and ubiquitously generic low-signal queries", () => {
    const genericCorpus = Array.from({ length: 20 }, (_, index) =>
      makeChunk(`generic-${index}`, {
        title: "Platform guide",
        content: `Liara topic${index}`,
      }),
    );
    const ranker = createLexicalRanker(genericCorpus);

    expect(
      ranker.rank(makeQuery({ text: "   " }), null).matches,
    ).toEqual([]);
    expect(
      ranker.rank(makeQuery({ text: "unrelated-needle" }), null).matches,
    ).toEqual([]);
    expect(ranker.rank(makeQuery({ text: "Liara" }), null).matches).toEqual(
      [],
    );
    expect(
      ranker.rank(makeQuery({ text: "Liara quantum banana" }), null).matches,
    ).toEqual([]);
  });

  it("handles a representative bilingual Next.js deployment query", () => {
    const deploy = makeChunk("deploy", {
      repositoryPath: "src/pages/paas/nextjs/how-tos/deploy-app.mdx",
      title: "استقرار برنامه‌های NextJS",
      sectionHeading: "استقرار",
      content: "برای استقرار برنامه از دستور رسمی لیارا استفاده کنید.",
      frameworkOrRuntime: "nextjs",
    });
    const email = makeChunk("email", {
      repositoryPath: "src/pages/email-server/how-tos/send.mdx",
      title: "ارسال ایمیل",
      content: "نمونه کد NextJS برای ارسال ایمیل در برنامه.",
      category: "email-server",
    });
    const result = createLexicalRanker([email, deploy]).rank(
      makeQuery({ text: "چگونه Next.js را روی Liara مستقر کنم" }),
      null,
    );

    expect(result.matches[0]?.chunk.chunkId).toBe(deploy.chunkId);
    expect(result.matches.some((match) => match.chunk === email)).toBe(false);
  });

  it("normalizes colloquial Persian Next.js deployment terms", () => {
    const deploy = makeChunk("nextjs-deploy", {
      title: "استقرار برنامه‌های NextJS",
      sectionHeading: "استقرار برنامه",
      content: "برای استقرار برنامه NextJS در لیارا از راهنمای رسمی استفاده کنید.",
      frameworkOrRuntime: "nextjs",
    });
    const unrelated = makeChunk("email", {
      title: "ارسال ایمیل",
      content: "نمونه کد NextJS برای ارسال ایمیل.",
      category: "email-server",
    });
    const result = createLexicalRanker([unrelated, deploy]).rank(
      makeQuery({ text: "چطوری نکست رو رو لیارا دیپلوی کنم؟" }),
      null,
    );

    expect(result.matches[0]?.chunk.chunkId).toBe(deploy.chunkId);
    expect(result.matches.some((match) => match.chunk === unrelated)).toBe(
      false,
    );
  });

  it("retrieves deployment diagnostics for a mixed-language failure query", () => {
    const troubleshooting = makeChunk("nextjs-troubleshooting", {
      title: "خطاهای استقرار NextJS",
      sectionHeading: "بررسی لاگ استقرار",
      content:
        "اگر build موفق است ولی deploy شکست می‌خورد، لاگ برنامه و خطای استقرار را بررسی کنید.",
      frameworkOrRuntime: "nextjs",
    });
    const generic = makeChunk("generic-deploy", {
      title: "استقرار برنامه",
      content: "راهنمای عمومی deploy برنامه در لیارا.",
    });
    const result = createLexicalRanker([generic, troubleshooting]).rank(
      makeQuery({
        text: "پروژه Next.js من build میشه ولی deploy روی Liara fail میشه؛ از کجا شروع کنم؟",
      }),
      null,
    );

    expect(result.matches[0]?.chunk.chunkId).toBe(troubleshooting.chunkId);
  });

  it("prefers general application environment guidance over service examples", () => {
    const environment = makeChunk("nextjs-environment", {
      title: "متغیرهای محیطی برنامه NextJS",
      sectionHeading: "تنظیم متغیرهای محیطی",
      content: "متغیر محیطی برنامه NextJS را در تنظیمات برنامه تعریف کنید.",
      frameworkOrRuntime: "nextjs",
    });
    const email = makeChunk("email-environment", {
      title: "ارسال ایمیل در NextJS",
      content: "متغیرهای محیطی سرویس ایمیل را در برنامه NextJS تنظیم کنید.",
      category: "email-server",
      service: "email-server",
    });
    const result = createLexicalRanker([email, environment]).rank(
      makeQuery({ text: "برای Next.js env variables روی Liara چی کار کنم؟" }),
      null,
    );

    expect(result.matches[0]?.chunk.chunkId).toBe(environment.chunkId);
  });

  it("honors finite limits and returns frozen result collections", () => {
    const chunks = [
      makeChunk("one", { content: "deploy next.js one" }),
      makeChunk("two", { content: "deploy next.js two" }),
    ];
    const result = createLexicalRanker(chunks).rank(
      makeQuery({ limit: 1.9 }),
      null,
    );

    expect(result.matches).toHaveLength(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.matches)).toBe(true);
    expect(Object.isFrozen(result.matches[0])).toBe(true);
    expect(Object.isFrozen(result.matches[0]?.matchedTerms)).toBe(true);
  });
});
