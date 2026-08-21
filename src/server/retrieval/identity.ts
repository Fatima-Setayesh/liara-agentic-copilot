import { createHash } from "node:crypto";

import type {
  DocumentationChunkId,
  DocumentationContentHash,
  DocumentationDocumentId,
  DocumentationRevision,
  DocumentationSectionId,
} from "./types";

const GIT_REVISION_PATTERN = /^[a-f0-9]{40}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function digestIdentity(namespace: string, parts: readonly string[]): string {
  const hash = createHash("sha256").update(namespace).update("\0");

  for (const part of parts) {
    hash.update(String(Buffer.byteLength(part, "utf8"))).update(":").update(part);
  }

  const digest = hash.digest("hex").slice(0, 24);

  return digest;
}

export function parseDocumentationRevision(value: string): DocumentationRevision {
  if (!GIT_REVISION_PATTERN.test(value)) {
    throw new TypeError("Documentation revision must be a 40-character Git commit hash");
  }

  return value.toLowerCase() as DocumentationRevision;
}

export function parseDocumentationContentHash(
  value: string,
): DocumentationContentHash {
  if (!SHA256_PATTERN.test(value)) {
    throw new TypeError("Documentation content hash must be a SHA-256 hex digest");
  }

  return value.toLowerCase() as DocumentationContentHash;
}

export function createDocumentationContentHash(
  content: string,
): DocumentationContentHash {
  return createHash("sha256").update(content, "utf8").digest("hex") as DocumentationContentHash;
}

export function createDocumentationDocumentId(
  repositoryPath: string,
): DocumentationDocumentId {
  return `doc_${digestIdentity("document", [repositoryPath])}` as DocumentationDocumentId;
}

export function createDocumentationSectionId(
  documentId: DocumentationDocumentId,
  headingPath: readonly string[],
  anchor: string | null,
  order: number,
): DocumentationSectionId {
  return `section_${digestIdentity("section", [
    documentId,
    String(headingPath.length),
    ...headingPath,
    anchor ?? "",
    String(order),
  ])}` as DocumentationSectionId;
}

export function createDocumentationChunkId(
  documentId: DocumentationDocumentId,
  sectionId: DocumentationSectionId | null,
  order: number,
  content: string,
): DocumentationChunkId {
  return `chunk_${digestIdentity("chunk", [
    documentId,
    sectionId ?? "",
    String(order),
    createDocumentationContentHash(content),
  ])}` as DocumentationChunkId;
}
