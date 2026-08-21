import path from "node:path";

import { z } from "zod";

import { buildDocumentationCorpus } from "./corpus";
import { createInMemoryLexicalRetriever } from "./retriever";
import type { Retriever } from "./types";

const runtimeRetrievalEnvironmentSchema = z.object({
  LIARA_DOCS_REPOSITORY_PATH: z
    .string()
    .trim()
    .min(1)
    .refine(path.isAbsolute, "Must be an absolute path"),
  LIARA_DOCS_REVISION: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{40}$/iu, "Must be a full Git commit hash"),
});

export interface RuntimeRetrievalConfig {
  readonly repositoryRoot: string;
  readonly revision: string;
}

export class RetrievalConfigurationError extends Error {
  constructor() {
    super("Server retrieval configuration is incomplete or invalid");
    this.name = "RetrievalConfigurationError";
  }
}

export function loadRuntimeRetrievalConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RuntimeRetrievalConfig {
  const parsed = runtimeRetrievalEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new RetrievalConfigurationError();
  }

  return Object.freeze({
    repositoryRoot: path.resolve(parsed.data.LIARA_DOCS_REPOSITORY_PATH),
    revision: parsed.data.LIARA_DOCS_REVISION.toLowerCase(),
  });
}

interface CachedRetriever {
  readonly key: string;
  readonly promise: Promise<Retriever>;
}

let cachedRetriever: CachedRetriever | null = null;

export async function createRuntimeRetriever(
  config: RuntimeRetrievalConfig,
  signal: AbortSignal | null = null,
): Promise<Retriever> {
  const corpus = await buildDocumentationCorpus({
    repositoryRoot: config.repositoryRoot,
    revision: config.revision,
    ...(signal === null ? {} : { signal }),
  });

  return createInMemoryLexicalRetriever(corpus.chunks);
}

export async function getRuntimeRetriever(
  config: RuntimeRetrievalConfig,
): Promise<Retriever> {
  const key = `${config.repositoryRoot}\0${config.revision}`;

  if (cachedRetriever?.key === key) {
    return cachedRetriever.promise;
  }

  const promise = createRuntimeRetriever(config);
  cachedRetriever = { key, promise };

  try {
    return await promise;
  } catch (error) {
    if (cachedRetriever?.promise === promise) {
      cachedRetriever = null;
    }
    throw error;
  }
}
