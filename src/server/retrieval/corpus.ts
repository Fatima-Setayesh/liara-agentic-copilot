import {
  loadDocumentationFiles,
  type LoadDocumentationFilesOptions,
} from "./ingest";
import {
  chunkDocumentationDocument,
  type ChunkDocumentationOptions,
} from "./chunk";
import { normalizeDocumentationFile } from "./normalize";
import type {
  DocumentationChunk,
  NormalizedDocument,
  NormalizationResult,
} from "./types";

export interface SkippedDocumentationFile {
  readonly repositoryPath: string;
  readonly reason: Extract<NormalizationResult, { kind: "skipped" }>["reason"];
}

export interface DocumentationCorpus {
  readonly loadedFileCount: number;
  readonly documents: readonly NormalizedDocument[];
  readonly chunks: readonly DocumentationChunk[];
  readonly skippedFiles: readonly SkippedDocumentationFile[];
  readonly diagnosticCount: number;
}

export interface BuildDocumentationCorpusOptions
  extends LoadDocumentationFilesOptions {
  readonly chunking?: ChunkDocumentationOptions;
}

const CORPUS_YIELD_INTERVAL = 8;

export async function buildDocumentationCorpus(
  options: BuildDocumentationCorpusOptions,
): Promise<DocumentationCorpus> {
  const files = await loadDocumentationFiles(options);
  const documents: NormalizedDocument[] = [];
  const chunks: DocumentationChunk[] = [];
  const skippedFiles: SkippedDocumentationFile[] = [];
  let diagnosticCount = 0;

  for (const [index, file] of files.entries()) {
    if (index > 0 && index % CORPUS_YIELD_INTERVAL === 0) {
      await scheduler.yield();
    }
    options.signal?.throwIfAborted();
    const result = normalizeDocumentationFile(
      file,
      options.signal ? { signal: options.signal } : {},
    );

    if (result.kind === "skipped") {
      skippedFiles.push({
        repositoryPath: result.repositoryPath,
        reason: result.reason,
      });
      continue;
    }

    documents.push(result.document);
    diagnosticCount += result.document.diagnostics.length;
    chunks.push(...chunkDocumentationDocument(result.document, options.chunking));
  }

  return {
    loadedFileCount: files.length,
    documents,
    chunks,
    skippedFiles,
    diagnosticCount,
  };
}
import { scheduler } from "node:timers/promises";
