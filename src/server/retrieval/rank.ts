import {
  analyzeLexicalText,
  tokenSetJaccard,
  type LexicalTextAnalysis,
} from "./text";
import type {
  DocumentationChunk,
  RetrievalMatch,
  RetrievalQuery,
} from "./types";

const BM25_SATURATION = 1.2;
const BM25_LENGTH_NORMALIZATION = 0.75;
const MINIMUM_RELEVANCE_SCORE = 0.55;
const MINIMUM_WEIGHTED_QUERY_COVERAGE = 0.4;
const MAX_COMMON_TERM_DOCUMENT_RATIO = 0.65;
const MINIMUM_NEAR_DUPLICATE_TOKEN_COUNT = 20;
const NEAR_DUPLICATE_THRESHOLD = 0.95;
const MINIMUM_DUPLICATE_LENGTH_RATIO = 0.85;

export const MAX_LEXICAL_RESULT_LIMIT = 20;

const QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "are",
  "can",
  "could",
  "do",
  "does",
  "for",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "please",
  "should",
  "the",
  "to",
  "what",
  "where",
  "with",
  "از",
  "است",
  "این",
  "آن",
  "با",
  "برای",
  "به",
  "باید",
  "چی",
  "چطوری",
  "چطور",
  "چگونه",
  "در",
  "را",
  "رو",
  "روی",
  "شروع",
  "شود",
  "که",
  "کجا",
  "کار",
  "لیارا",
  "می",
  "میشه",
  "من",
  "ولی",
  "و",
  "یا",
  "یک",
  "کنم",
  "کنیم",
  "کنید",
  "خواهم",
]);

const NEXTJS_QUERY_TERMS = ["next.js", "nextjs", "next", "نکست"] as const;
const DEPLOYMENT_QUERY_TERMS = [
  "deploy",
  "deployed",
  "deployment",
  "استقرار",
  "دیپلوی",
  "مستقر",
] as const;
const ENVIRONMENT_QUERY_TERMS = [
  "env",
  "environment",
  "environment variable",
  "environment variables",
  "variable",
  "variables",
  "متغیر محیطی",
  "متغیرهای محیطی",
] as const;
const BUILD_QUERY_TERMS = ["build", "built", "بیلد", "ساخت"] as const;
const FAILURE_QUERY_TERMS = [
  "error",
  "errors",
  "fail",
  "failed",
  "failure",
  "log",
  "logs",
  "logging",
  "خطا",
  "مشکل",
  "لاگ",
] as const;

const QUERY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  app: ["application", "برنامه", "پروژه"],
  application: ["app", "برنامه", "پروژه"],
  applications: ["app", "application", "برنامه", "پروژه"],
  project: ["app", "application", "برنامه", "پروژه"],
  پروژه: ["app", "application", "برنامه"],
  database: ["دیتابیس"],
  databases: ["دیتابیس"],
  deploy: DEPLOYMENT_QUERY_TERMS,
  deployed: DEPLOYMENT_QUERY_TERMS,
  deployment: DEPLOYMENT_QUERY_TERMS,
  استقرار: DEPLOYMENT_QUERY_TERMS,
  دیپلوی: DEPLOYMENT_QUERY_TERMS,
  مستقر: DEPLOYMENT_QUERY_TERMS,
  domain: ["دامنه"],
  domains: ["دامنه"],
  email: ["ایمیل"],
  "next.js": NEXTJS_QUERY_TERMS,
  nextjs: NEXTJS_QUERY_TERMS,
  next: NEXTJS_QUERY_TERMS,
  نکست: NEXTJS_QUERY_TERMS,
  env: ENVIRONMENT_QUERY_TERMS,
  environment: ENVIRONMENT_QUERY_TERMS,
  variable: ENVIRONMENT_QUERY_TERMS,
  variables: ENVIRONMENT_QUERY_TERMS,
  متغیر: ENVIRONMENT_QUERY_TERMS,
  متغیرهای: ENVIRONMENT_QUERY_TERMS,
  محیطی: ENVIRONMENT_QUERY_TERMS,
  build: BUILD_QUERY_TERMS,
  built: BUILD_QUERY_TERMS,
  بیلد: BUILD_QUERY_TERMS,
  log: FAILURE_QUERY_TERMS,
  logging: FAILURE_QUERY_TERMS,
  logs: FAILURE_QUERY_TERMS,
  error: FAILURE_QUERY_TERMS,
  errors: FAILURE_QUERY_TERMS,
  fail: FAILURE_QUERY_TERMS,
  failed: FAILURE_QUERY_TERMS,
  failure: FAILURE_QUERY_TERMS,
  خطا: FAILURE_QUERY_TERMS,
  مشکل: FAILURE_QUERY_TERMS,
  لاگ: FAILURE_QUERY_TERMS,
};

interface IndexedChunk {
  readonly chunk: DocumentationChunk;
  readonly body: LexicalTextAnalysis;
  readonly title: LexicalTextAnalysis;
  readonly heading: LexicalTextAnalysis;
  readonly path: LexicalTextAnalysis;
  readonly classification: LexicalTextAnalysis;
  readonly allUniqueTokens: readonly string[];
}

interface ScoredChunk {
  readonly entry: IndexedChunk;
  readonly score: number;
  readonly matchedTerms: readonly string[];
}

interface QueryTermGroup {
  readonly tokens: readonly string[];
}

interface PreparedQuery {
  readonly analysis: LexicalTextAnalysis;
  readonly termGroups: readonly QueryTermGroup[];
}

export interface LexicalRankingResult {
  readonly matches: readonly RetrievalMatch[];
  readonly consideredChunkCount: number;
}

export interface LexicalRanker {
  rank(
    query: RetrievalQuery,
    signal: AbortSignal | null,
  ): LexicalRankingResult;
}

function stringCompare(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function normalizedFilterValue(value: string): string {
  return analyzeLexicalText(value).normalizedText.replace(/[._/+:\-\s]/gu, "");
}

function matchesOptionalFilter(
  actual: string | null,
  expected: string | null,
): boolean {
  if (expected === null) {
    return true;
  }

  if (actual === null) {
    return false;
  }

  const normalizedExpected = normalizedFilterValue(expected);

  return (
    normalizedExpected.length > 0 &&
    normalizedFilterValue(actual) === normalizedExpected
  );
}

function matchesFilters(entry: IndexedChunk, query: RetrievalQuery): boolean {
  const classification = entry.chunk.source.classification;

  return (
    (query.category === null || classification.category === query.category) &&
    matchesOptionalFilter(
      classification.frameworkOrRuntime,
      query.frameworkOrRuntime,
    ) &&
    matchesOptionalFilter(classification.service, query.service)
  );
}

function combinedUniqueTokens(
  analyses: readonly LexicalTextAnalysis[],
): readonly string[] {
  const tokens = new Set<string>();

  for (const analysis of analyses) {
    for (const token of analysis.uniqueTokens) {
      tokens.add(token);
    }
  }

  return Object.freeze(Array.from(tokens));
}

function indexChunk(chunk: DocumentationChunk): IndexedChunk {
  const body = analyzeLexicalText(chunk.content);
  const title = analyzeLexicalText(chunk.title);
  const heading = analyzeLexicalText(
    [chunk.sectionHeading, ...chunk.headingPath]
      .filter((value): value is string => value !== null)
      .join(" "),
  );
  const path = analyzeLexicalText(
    `${chunk.source.repositoryPath} ${chunk.source.publishedPath}`,
  );
  const classification = analyzeLexicalText(
    [
      chunk.source.classification.category,
      chunk.source.classification.frameworkOrRuntime,
      chunk.source.classification.service,
    ]
      .filter((value): value is string => value !== null)
      .join(" "),
  );

  return Object.freeze({
    chunk,
    body,
    title,
    heading,
    path,
    classification,
    allUniqueTokens: combinedUniqueTokens([
      body,
      title,
      heading,
      path,
      classification,
    ]),
  });
}

function prepareQuery(text: string): PreparedQuery {
  const base = analyzeLexicalText(text);
  const scoringTokens = new Set<string>();
  const termGroups: QueryTermGroup[] = [];

  for (const candidate of base.normalizedText.split(" ").filter(Boolean)) {
    if (QUERY_STOPWORDS.has(candidate)) continue;

    const groupTokens = new Set(analyzeLexicalText(candidate).uniqueTokens);
    for (const alias of QUERY_ALIASES[candidate] ?? []) {
      for (const aliasToken of analyzeLexicalText(alias).uniqueTokens) {
        groupTokens.add(aliasToken);
      }
    }

    const tokens = Object.freeze(Array.from(groupTokens));
    if (tokens.length === 0) continue;
    for (const token of tokens) scoringTokens.add(token);
    termGroups.push(Object.freeze({ tokens }));
  }

  const uniqueTokens = Object.freeze(Array.from(scoringTokens));
  const tokenFrequencies = Object.freeze(
    Object.fromEntries(uniqueTokens.map((token) => [token, 1])),
  );

  return Object.freeze({
    analysis: Object.freeze({
      normalizedText: base.normalizedText,
      tokens: uniqueTokens,
      uniqueTokens,
      tokenFrequencies,
    }),
    termGroups: Object.freeze(termGroups),
  });
}

function buildDocumentFrequencies(
  entries: readonly IndexedChunk[],
): ReadonlyMap<string, number> {
  const frequencies = new Map<string, number>();

  for (const entry of entries) {
    for (const token of entry.allUniqueTokens) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
  }

  return frequencies;
}

function inverseDocumentFrequency(
  corpusSize: number,
  documentFrequency: number,
): number {
  return Math.log(
    1 + (corpusSize - documentFrequency + 0.5) / (documentFrequency + 0.5),
  );
}

function bm25TermScore(
  termFrequency: number,
  bodyLength: number,
  averageBodyLength: number,
  inverseFrequency: number,
): number {
  if (termFrequency === 0) {
    return 0;
  }

  const normalizedLength =
    averageBodyLength === 0 ? 1 : bodyLength / averageBodyLength;
  const denominator =
    termFrequency +
    BM25_SATURATION *
      (1 - BM25_LENGTH_NORMALIZATION +
        BM25_LENGTH_NORMALIZATION * normalizedLength);

  return (
    inverseFrequency *
    ((termFrequency * (BM25_SATURATION + 1)) / denominator)
  );
}

function containsTerm(analysis: LexicalTextAnalysis, term: string): boolean {
  return (analysis.tokenFrequencies[term] ?? 0) > 0;
}

function phraseBonus(
  entry: IndexedChunk,
  queryAnalysis: LexicalTextAnalysis,
): number {
  if (queryAnalysis.uniqueTokens.length < 2) {
    return 0;
  }

  const normalizedQuery = queryAnalysis.normalizedText;

  if (entry.title.normalizedText.includes(normalizedQuery)) {
    return 2.4;
  }

  if (entry.heading.normalizedText.includes(normalizedQuery)) {
    return 1.9;
  }

  if (entry.body.normalizedText.includes(normalizedQuery)) {
    return 1.1;
  }

  return 0;
}

function scoreEntry(
  entry: IndexedChunk,
  query: PreparedQuery,
  averageBodyLength: number,
  documentFrequencies: ReadonlyMap<string, number>,
  corpusSize: number,
): ScoredChunk | null {
  let score = 0;
  const matchedTerms: string[] = [];
  let hasLocalEvidence = false;

  for (const term of query.analysis.uniqueTokens) {
    if (!entry.allUniqueTokens.includes(term)) {
      continue;
    }

    matchedTerms.push(term);
    const inverseFrequency = inverseDocumentFrequency(
      corpusSize,
      documentFrequencies.get(term) ?? 0,
    );

    score += bm25TermScore(
      entry.body.tokenFrequencies[term] ?? 0,
      entry.body.tokens.length,
      averageBodyLength,
      inverseFrequency,
    );

    if (containsTerm(entry.body, term) || containsTerm(entry.heading, term)) {
      hasLocalEvidence = true;
    }

    if (containsTerm(entry.title, term)) {
      score += inverseFrequency * 2.4;
    }
    if (containsTerm(entry.heading, term)) {
      score += inverseFrequency * 1.9;
    }
    if (containsTerm(entry.path, term)) {
      score += inverseFrequency * 1.15;
    }
    if (containsTerm(entry.classification, term)) {
      score += inverseFrequency * 0.85;
    }
  }

  if (matchedTerms.length === 0) {
    return null;
  }

  if (
    !hasLocalEvidence &&
    !(
      entry.chunk.order === 0 &&
      matchedTerms.some(
        (term) => containsTerm(entry.title, term) || containsTerm(entry.path, term),
      )
    )
  ) {
    return null;
  }

  let totalGroupWeight = 0;
  let matchedGroupWeight = 0;
  let hasDiscriminativeMatch = false;

  for (const group of query.termGroups) {
    const groupWeight = Math.max(
      ...group.tokens.map((term) =>
        inverseDocumentFrequency(
          corpusSize,
          documentFrequencies.get(term) ?? 0,
        ),
      ),
    );
    totalGroupWeight += groupWeight;

    const matchingTokens = group.tokens.filter((term) =>
      entry.allUniqueTokens.includes(term),
    );
    if (matchingTokens.length === 0) continue;

    matchedGroupWeight += groupWeight;
    if (
      matchingTokens.some(
        (term) =>
          (documentFrequencies.get(term) ?? 0) / corpusSize <=
          MAX_COMMON_TERM_DOCUMENT_RATIO,
      )
    ) {
      hasDiscriminativeMatch = true;
    }
  }

  const coverage =
    totalGroupWeight === 0 ? 0 : matchedGroupWeight / totalGroupWeight;

  if (
    (corpusSize >= 10 && !hasDiscriminativeMatch) ||
    coverage < MINIMUM_WEIGHTED_QUERY_COVERAGE
  ) {
    return null;
  }

  score += coverage * 0.35;
  score += phraseBonus(entry, query.analysis);

  if (score < MINIMUM_RELEVANCE_SCORE) {
    return null;
  }

  return Object.freeze({
    entry,
    score: Number(score.toFixed(6)),
    matchedTerms: Object.freeze(matchedTerms),
  });
}

function compareScoredChunks(left: ScoredChunk, right: ScoredChunk): number {
  const scoreDifference = right.score - left.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const pathDifference = stringCompare(
    left.entry.chunk.source.repositoryPath,
    right.entry.chunk.source.repositoryPath,
  );

  if (pathDifference !== 0) {
    return pathDifference;
  }

  const orderDifference = left.entry.chunk.order - right.entry.chunk.order;

  if (orderDifference !== 0) {
    return orderDifference;
  }

  return stringCompare(left.entry.chunk.chunkId, right.entry.chunk.chunkId);
}

function isDuplicate(left: IndexedChunk, right: IndexedChunk): boolean {
  const sameDocument = left.chunk.documentId === right.chunk.documentId;
  const distinctSections =
    left.chunk.sectionId !== null &&
    right.chunk.sectionId !== null &&
    left.chunk.sectionId !== right.chunk.sectionId;

  if (sameDocument && distinctSections) {
    return false;
  }

  if (left.body.normalizedText === right.body.normalizedText) {
    return left.body.normalizedText.length > 0;
  }

  const shorterLength = Math.min(
    left.body.normalizedText.length,
    right.body.normalizedText.length,
  );
  const longerLength = Math.max(
    left.body.normalizedText.length,
    right.body.normalizedText.length,
  );

  if (
    shorterLength === 0 ||
    shorterLength / longerLength < MINIMUM_DUPLICATE_LENGTH_RATIO ||
    Math.min(left.body.uniqueTokens.length, right.body.uniqueTokens.length) <
      MINIMUM_NEAR_DUPLICATE_TOKEN_COUNT
  ) {
    return false;
  }

  return (
    tokenSetJaccard(left.body.uniqueTokens, right.body.uniqueTokens) >=
    NEAR_DUPLICATE_THRESHOLD
  );
}

function normalizedLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.min(Math.floor(limit), MAX_LEXICAL_RESULT_LIMIT);
}

function freezeMatches(
  candidates: readonly ScoredChunk[],
  limit: number,
  signal: AbortSignal | null,
): readonly RetrievalMatch[] {
  const selected: ScoredChunk[] = [];

  for (const candidate of candidates) {
    signal?.throwIfAborted();

    if (
      selected.some((existing) =>
        isDuplicate(existing.entry, candidate.entry),
      )
    ) {
      continue;
    }

    selected.push(candidate);

    if (selected.length === limit) {
      break;
    }
  }

  return Object.freeze(
    selected.map((candidate, index) =>
      Object.freeze({
        chunk: candidate.entry.chunk,
        rank: index + 1,
        score: candidate.score,
        matchedTerms: candidate.matchedTerms,
      }),
    ),
  );
}

export function createLexicalRanker(
  chunks: readonly DocumentationChunk[],
): LexicalRanker {
  const entries = Object.freeze(chunks.map(indexChunk));
  const documentFrequencies = buildDocumentFrequencies(entries);
  const averageBodyLength =
    entries.length === 0
      ? 0
      : entries.reduce((sum, entry) => sum + entry.body.tokens.length, 0) /
        entries.length;

  return Object.freeze({
    rank(
      query: RetrievalQuery,
      signal: AbortSignal | null,
    ): LexicalRankingResult {
      signal?.throwIfAborted();

      const limit = normalizedLimit(query.limit);
      const preparedQuery = prepareQuery(query.text);

      if (limit === 0 || preparedQuery.termGroups.length === 0) {
        return Object.freeze({
          matches: Object.freeze([]),
          consideredChunkCount: 0,
        });
      }

      const filteredEntries = entries.filter((entry) =>
        matchesFilters(entry, query),
      );
      const scored: ScoredChunk[] = [];

      for (const entry of filteredEntries) {
        signal?.throwIfAborted();
        const result = scoreEntry(
          entry,
          preparedQuery,
          averageBodyLength,
          documentFrequencies,
          entries.length,
        );

        if (result !== null) {
          scored.push(result);
        }
      }

      scored.sort(compareScoredChunks);

      return Object.freeze({
        matches: freezeMatches(scored, limit, signal),
        consideredChunkCount: filteredEntries.length,
      });
    },
  });
}
