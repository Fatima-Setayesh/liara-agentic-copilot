import {
  createDocumentationContentHash,
  createDocumentationDocumentId,
  parseDocumentationContentHash,
  parseDocumentationRevision,
} from "./identity";
import {
  DOCUMENTATION_CATEGORIES,
  type DocumentationCategory,
  type DocumentationClassification,
  type DocumentationSource,
  type LoadedDocumentationFile,
} from "./types";

export const OFFICIAL_DOCUMENTATION_ORIGIN = "https://docs.liara.ir";
export const OFFICIAL_DOCUMENTATION_REPOSITORY =
  "https://github.com/liara-cloud/docs";
export const DOCUMENTATION_REPOSITORY_CONTENT_ROOT = "src/pages";

export const DOCUMENTATION_SOURCE_POLICY_ERROR_CODES = [
  "INVALID_REPOSITORY_PATH",
  "UNSUPPORTED_CATEGORY",
  "INVALID_REVISION",
  "INVALID_CONTENT_HASH",
  "CONTENT_HASH_MISMATCH",
] as const;

export type DocumentationSourcePolicyErrorCode =
  (typeof DOCUMENTATION_SOURCE_POLICY_ERROR_CODES)[number];

export class DocumentationSourcePolicyError extends Error {
  readonly code: DocumentationSourcePolicyErrorCode;
  readonly repositoryPath: string | null;

  constructor(
    code: DocumentationSourcePolicyErrorCode,
    message: string,
    repositoryPath: string | null,
    cause: unknown = null,
  ) {
    super(message);
    this.name = "DocumentationSourcePolicyError";
    this.code = code;
    this.repositoryPath = repositoryPath;

    if (cause !== null) {
      this.cause = cause;
    }
  }
}

interface ParsedDocumentationPath {
  readonly repositoryPath: string;
  readonly pathSegments: readonly string[];
  readonly category: DocumentationCategory;
}

const SAFE_PATH_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const DOCUMENTATION_CATEGORY_SET = new Set<string>(DOCUMENTATION_CATEGORIES);

const PAAS_FRAMEWORKS_AND_RUNTIMES = new Set([
  "angular",
  "django",
  "docker",
  "dotnet",
  "flask",
  "go",
  "laravel",
  "nextjs",
  "nodejs",
  "php",
  "python",
  "react",
  "static",
  "vue",
]);

const DBAAS_SERVICES = new Set([
  "elastic-search",
  "mariadb",
  "mongodb",
  "mssql",
  "mysql",
  "postgresql",
  "rabbitmq",
  "redis",
]);

function failPath(repositoryPath: string, message: string): never {
  throw new DocumentationSourcePolicyError(
    "INVALID_REPOSITORY_PATH",
    message,
    repositoryPath,
  );
}

function parseDocumentationPath(repositoryPath: string): ParsedDocumentationPath {
  if (
    repositoryPath.length === 0 ||
    repositoryPath.startsWith("/") ||
    repositoryPath.includes("\\") ||
    repositoryPath.includes("\0")
  ) {
    failPath(repositoryPath, "Documentation path must be a relative POSIX path");
  }

  const segments = repositoryPath.split("/");

  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        !SAFE_PATH_SEGMENT_PATTERN.test(segment),
    )
  ) {
    failPath(repositoryPath, "Documentation path contains an unsafe segment");
  }

  if (
    segments.length < 4 ||
    segments[0] !== "src" ||
    segments[1] !== "pages" ||
    !segments.at(-1)?.endsWith(".mdx")
  ) {
    failPath(
      repositoryPath,
      "Documentation path must match src/pages/<category>/**/*.mdx",
    );
  }

  const contentSegments = segments.slice(2);
  const fileName = contentSegments.at(-1);

  if (fileName === undefined) {
    failPath(repositoryPath, "Documentation path has no file name");
  }

  const pageName = fileName.slice(0, -".mdx".length);

  if (pageName.length === 0) {
    failPath(repositoryPath, "Documentation page name must not be empty");
  }

  const pathSegments = [...contentSegments.slice(0, -1), pageName];
  const categoryValue = pathSegments[0];

  if (
    categoryValue === undefined ||
    !DOCUMENTATION_CATEGORY_SET.has(categoryValue)
  ) {
    throw new DocumentationSourcePolicyError(
      "UNSUPPORTED_CATEGORY",
      "Documentation path is outside the approved Liara category allowlist",
      repositoryPath,
    );
  }

  return {
    repositoryPath,
    pathSegments,
    category: categoryValue as DocumentationCategory,
  };
}

function classifyDocumentationPath(
  category: DocumentationCategory,
  pathSegments: readonly string[],
): DocumentationClassification {
  const secondSegment = pathSegments[1] ?? null;

  if (
    category === "paas" &&
    secondSegment !== null &&
    PAAS_FRAMEWORKS_AND_RUNTIMES.has(secondSegment)
  ) {
    return {
      category,
      frameworkOrRuntime: secondSegment,
      service: null,
    };
  }

  if (
    category === "dbaas" &&
    secondSegment !== null &&
    DBAAS_SERVICES.has(secondSegment)
  ) {
    return {
      category,
      frameworkOrRuntime: null,
      service: secondSegment,
    };
  }

  if (
    category === "one-click-apps" &&
    secondSegment !== null &&
    secondSegment !== "about" &&
    pathSegments.length >= 3
  ) {
    return {
      category,
      frameworkOrRuntime: null,
      service: secondSegment,
    };
  }

  return {
    category,
    frameworkOrRuntime: null,
    service: null,
  };
}

export function createDocumentationSource(
  file: LoadedDocumentationFile,
): DocumentationSource {
  const parsedPath = parseDocumentationPath(file.repositoryPath);

  let revision;
  try {
    revision = parseDocumentationRevision(file.revision);
  } catch (error) {
    throw new DocumentationSourcePolicyError(
      "INVALID_REVISION",
      "Documentation source revision is not a full Git commit hash",
      file.repositoryPath,
      error,
    );
  }

  let contentHash;
  try {
    contentHash = parseDocumentationContentHash(file.contentHash);
  } catch (error) {
    throw new DocumentationSourcePolicyError(
      "INVALID_CONTENT_HASH",
      "Documentation source content hash is not a SHA-256 digest",
      file.repositoryPath,
      error,
    );
  }

  if (createDocumentationContentHash(file.rawMdx) !== contentHash) {
    throw new DocumentationSourcePolicyError(
      "CONTENT_HASH_MISMATCH",
      "Documentation source content does not match its recorded hash",
      file.repositoryPath,
    );
  }

  const publishedPath = `/${parsedPath.pathSegments.join("/")}/`;

  return {
    documentId: createDocumentationDocumentId(parsedPath.repositoryPath),
    repositoryPath: parsedPath.repositoryPath,
    publishedPath,
    publishedUrl: `${OFFICIAL_DOCUMENTATION_ORIGIN}${publishedPath}`,
    repositoryUrl: `${OFFICIAL_DOCUMENTATION_REPOSITORY}/blob/${revision}/${parsedPath.repositoryPath}`,
    revision,
    pathSegments: parsedPath.pathSegments,
    contentHash,
    classification: classifyDocumentationPath(
      parsedPath.category,
      parsedPath.pathSegments,
    ),
  };
}
