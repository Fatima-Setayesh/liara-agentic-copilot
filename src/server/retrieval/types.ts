declare const retrievalIdBrand: unique symbol;

type BrandedString<Name extends string> = string & {
  readonly [retrievalIdBrand]: Name;
};

export type DocumentationRevision = BrandedString<"DocumentationRevision">;
export type DocumentationContentHash = BrandedString<"DocumentationContentHash">;
export type DocumentationDocumentId = BrandedString<"DocumentationDocumentId">;
export type DocumentationSectionId = BrandedString<"DocumentationSectionId">;
export type DocumentationChunkId = BrandedString<"DocumentationChunkId">;

export const DOCUMENTATION_CATEGORIES = [
  "ai",
  "dbaas",
  "dns-management-system",
  "email-server",
  "iaas",
  "mirrors",
  "object-storage",
  "one-click-apps",
  "overview",
  "paas",
  "references",
] as const;

export type DocumentationCategory = (typeof DOCUMENTATION_CATEGORIES)[number];

export interface DocumentationClassification {
  readonly category: DocumentationCategory;
  readonly frameworkOrRuntime: string | null;
  readonly service: string | null;
}

export interface LoadedDocumentationFile {
  readonly repositoryPath: string;
  readonly revision: DocumentationRevision;
  readonly contentHash: DocumentationContentHash;
  readonly rawMdx: string;
}

export interface DocumentationSource {
  readonly documentId: DocumentationDocumentId;
  readonly repositoryPath: string;
  readonly publishedPath: string;
  readonly publishedUrl: string;
  readonly repositoryUrl: string;
  readonly revision: DocumentationRevision;
  readonly pathSegments: readonly string[];
  readonly contentHash: DocumentationContentHash;
  readonly classification: DocumentationClassification;
}

export type NormalizedBlockKind = "text" | "code";

export interface NormalizedBlock {
  readonly kind: NormalizedBlockKind;
  readonly text: string;
  readonly language: string | null;
}

export interface NormalizationSourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number | null;
}

export interface NormalizationDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly position: NormalizationSourcePosition | null;
}

export interface NormalizedSection {
  readonly sectionId: DocumentationSectionId;
  readonly documentId: DocumentationDocumentId;
  readonly heading: string | null;
  readonly headingPath: readonly string[];
  readonly anchor: string | null;
  readonly order: number;
  readonly blocks: readonly NormalizedBlock[];
}

export interface NormalizedDocument {
  readonly documentId: DocumentationDocumentId;
  readonly source: DocumentationSource;
  readonly title: string;
  readonly description: string | null;
  readonly sections: readonly NormalizedSection[];
  readonly diagnostics: readonly NormalizationDiagnostic[];
}

export type NormalizationResult =
  | {
      readonly kind: "document";
      readonly document: NormalizedDocument;
    }
  | {
      readonly kind: "skipped";
      readonly repositoryPath: string;
      readonly reason: "empty_source" | "no_retrievable_content";
    };

export interface DocumentationChunk {
  readonly chunkId: DocumentationChunkId;
  readonly documentId: DocumentationDocumentId;
  readonly sectionId: DocumentationSectionId | null;
  readonly source: DocumentationSource;
  readonly title: string;
  readonly sectionHeading: string | null;
  readonly headingPath: readonly string[];
  readonly anchor: string | null;
  readonly content: string;
  readonly order: number;
  readonly estimatedTokens: number;
}

export interface RetrievalQuery {
  readonly text: string;
  readonly limit: number;
  readonly category: DocumentationCategory | null;
  readonly frameworkOrRuntime: string | null;
  readonly service: string | null;
}

export interface RetrievalMatch {
  readonly chunk: DocumentationChunk;
  readonly rank: number;
  readonly score: number;
  readonly matchedTerms: readonly string[];
}

export type RetrievalOutcome =
  | {
      readonly kind: "matches";
      readonly matches: readonly RetrievalMatch[];
      readonly consideredChunkCount: number;
    }
  | {
      readonly kind: "no_matches";
      readonly matches: readonly [];
      readonly consideredChunkCount: number;
    };

export interface RetrievalOptions {
  readonly signal: AbortSignal | null;
}

export interface Retriever {
  retrieve(
    query: RetrievalQuery,
    options: RetrievalOptions,
  ): Promise<RetrievalOutcome>;
}
