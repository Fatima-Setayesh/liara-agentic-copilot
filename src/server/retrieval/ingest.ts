import { execFile } from "node:child_process";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  createDocumentationContentHash,
  parseDocumentationRevision,
} from "./identity";
import type {
  DocumentationRevision,
  LoadedDocumentationFile,
} from "./types";

export const DEFAULT_MAX_DOCUMENTATION_FILE_BYTES = 1_048_576;

const GIT_COMMAND_TIMEOUT_MS = 10_000;
const GIT_COMMAND_MAX_BUFFER_BYTES = 4 * 1_048_576;
const DOCUMENTATION_SOURCE_PATHSPEC = "src/pages";
const executeFile = promisify(execFile);

export const DOCUMENTATION_INGESTION_ERROR_CODES = [
  "INVALID_REPOSITORY_ROOT",
  "INVALID_REVISION",
  "INVALID_MAX_FILE_SIZE",
  "REPOSITORY_NOT_FOUND",
  "CONTENT_ROOT_NOT_FOUND",
  "GIT_UNAVAILABLE",
  "NOT_GIT_WORKTREE",
  "REVISION_MISMATCH",
  "SOURCE_CHECKOUT_DIRTY",
  "GIT_VERIFICATION_FAILED",
  "GIT_VERIFICATION_TIMEOUT",
  "SYMLINK_NOT_ALLOWED",
  "UNSAFE_PATH",
  "FILE_TOO_LARGE",
  "READ_FAILED",
  "ABORTED",
] as const;

export type DocumentationIngestionErrorCode =
  (typeof DOCUMENTATION_INGESTION_ERROR_CODES)[number];

export class DocumentationIngestionError extends Error {
  readonly code: DocumentationIngestionErrorCode;
  readonly repositoryPath: string | null;

  constructor(
    code: DocumentationIngestionErrorCode,
    message: string,
    repositoryPath: string | null,
    cause: unknown = null,
  ) {
    super(message);
    this.name = "DocumentationIngestionError";
    this.code = code;
    this.repositoryPath = repositoryPath;

    if (cause !== null) {
      this.cause = cause;
    }
  }
}

export interface LoadDocumentationFilesOptions {
  readonly repositoryRoot: string;
  readonly revision: string;
  readonly maxFileBytes?: number;
  readonly signal?: AbortSignal;
}

function compareAscii(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isTimedOutProcessError(
  error: unknown,
): error is Error & { readonly killed: true } {
  return (
    error instanceof Error &&
    "killed" in error &&
    error.killed === true
  );
}

function abortIfRequested(
  signal: AbortSignal | undefined,
  repositoryPath: string | null,
): void {
  if (signal?.aborted === true) {
    throw new DocumentationIngestionError(
      "ABORTED",
      "Documentation ingestion was cancelled",
      repositoryPath,
      signal.reason,
    );
  }
}

async function runGit(
  repositoryRoot: string,
  arguments_: readonly string[],
  signal: AbortSignal | undefined,
  failureCode: DocumentationIngestionErrorCode,
  failureMessage: string,
): Promise<string> {
  abortIfRequested(signal, null);

  try {
    const result = await executeFile("git", arguments_, {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: GIT_COMMAND_MAX_BUFFER_BYTES,
      timeout: GIT_COMMAND_TIMEOUT_MS,
      windowsHide: true,
      ...(signal === undefined ? {} : { signal }),
    });

    abortIfRequested(signal, null);
    return result.stdout;
  } catch (error) {
    if (
      signal?.aborted === true ||
      (error instanceof Error &&
        (error.name === "AbortError" ||
          (isNodeError(error) && error.code === "ABORT_ERR")))
    ) {
      throw new DocumentationIngestionError(
        "ABORTED",
        "Documentation ingestion was cancelled",
        null,
        signal?.reason ?? error,
      );
    }

    if (isNodeError(error) && error.code === "ENOENT") {
      throw new DocumentationIngestionError(
        "GIT_UNAVAILABLE",
        "Git is required to verify the documentation checkout revision",
        null,
        error,
      );
    }

    if (isTimedOutProcessError(error)) {
      throw new DocumentationIngestionError(
        "GIT_VERIFICATION_TIMEOUT",
        "Git checkout verification exceeded its time limit",
        null,
        error,
      );
    }

    throw new DocumentationIngestionError(
      failureCode,
      failureMessage,
      null,
      error,
    );
  }
}

function normalizePathForComparison(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

async function requireExactGitWorktree(
  repositoryRoot: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  const topLevelOutput = await runGit(
    repositoryRoot,
    ["rev-parse", "--show-toplevel"],
    signal,
    "NOT_GIT_WORKTREE",
    "Documentation repository root must be a Git worktree",
  );

  const topLevel = topLevelOutput.trim();
  if (topLevel.length === 0) {
    throw new DocumentationIngestionError(
      "NOT_GIT_WORKTREE",
      "Documentation repository root must be a Git worktree",
      null,
    );
  }

  let canonicalTopLevel;
  try {
    canonicalTopLevel = await realpath(path.resolve(topLevel));
  } catch (error) {
    throw new DocumentationIngestionError(
      "GIT_VERIFICATION_FAILED",
      "Unable to resolve the Git worktree root",
      null,
      error,
    );
  }

  if (
    normalizePathForComparison(canonicalTopLevel) !==
    normalizePathForComparison(await realpath(repositoryRoot))
  ) {
    throw new DocumentationIngestionError(
      "NOT_GIT_WORKTREE",
      "Documentation repository root must be the Git worktree root",
      null,
    );
  }
}

async function requireHeadRevision(
  repositoryRoot: string,
  revision: DocumentationRevision,
  signal: AbortSignal | undefined,
): Promise<void> {
  const head = (
    await runGit(
      repositoryRoot,
      ["rev-parse", "--verify", "HEAD^{commit}"],
      signal,
      "REVISION_MISMATCH",
      "Documentation checkout does not have a verifiable HEAD commit",
    )
  )
    .trim()
    .toLowerCase();

  if (head !== revision) {
    throw new DocumentationIngestionError(
      "REVISION_MISMATCH",
      "Documentation checkout HEAD does not match the requested revision",
      null,
    );
  }
}

async function requireCleanSourceCheckout(
  repositoryRoot: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  const status = await runGit(
    repositoryRoot,
    [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=no",
      "--",
      DOCUMENTATION_SOURCE_PATHSPEC,
    ],
    signal,
    "GIT_VERIFICATION_FAILED",
    "Unable to verify documentation source cleanliness",
  );

  if (status.length > 0) {
    throw new DocumentationIngestionError(
      "SOURCE_CHECKOUT_DIRTY",
      "Tracked documentation sources differ from the requested revision",
      null,
    );
  }
}

async function listCommittedDocumentationPaths(
  repositoryRoot: string,
  signal: AbortSignal | undefined,
): Promise<ReadonlySet<string>> {
  const output = await runGit(
    repositoryRoot,
    [
      "ls-tree",
      "-r",
      "--name-only",
      "-z",
      "HEAD",
      "--",
      DOCUMENTATION_SOURCE_PATHSPEC,
    ],
    signal,
    "GIT_VERIFICATION_FAILED",
    "Unable to enumerate documentation sources at the requested revision",
  );

  return new Set(output.split("\0").filter((value) => value.length > 0));
}

function toRepositoryPath(
  contentRoot: string,
  absolutePath: string,
): string {
  const relativePath = path.relative(contentRoot, absolutePath);

  if (
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`)
  ) {
    throw new DocumentationIngestionError(
      "UNSAFE_PATH",
      "Documentation entry resolves outside src/pages",
      null,
    );
  }

  return `src/pages/${relativePath.split(path.sep).join("/")}`;
}

async function requireDirectory(
  absolutePath: string,
  missingCode: "REPOSITORY_NOT_FOUND" | "CONTENT_ROOT_NOT_FOUND",
  invalidCode: "INVALID_REPOSITORY_ROOT" | "CONTENT_ROOT_NOT_FOUND",
): Promise<void> {
  let stats;

  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new DocumentationIngestionError(
        missingCode,
        missingCode === "REPOSITORY_NOT_FOUND"
          ? "Documentation repository root does not exist"
          : "Documentation content root src/pages does not exist",
        null,
        error,
      );
    }

    throw new DocumentationIngestionError(
      "READ_FAILED",
      "Unable to inspect documentation repository",
      null,
      error,
    );
  }

  if (stats.isSymbolicLink()) {
    throw new DocumentationIngestionError(
      "SYMLINK_NOT_ALLOWED",
      "Symbolic links are not allowed in the documentation checkout path",
      null,
    );
  }

  if (!stats.isDirectory()) {
    throw new DocumentationIngestionError(
      invalidCode,
      invalidCode === "INVALID_REPOSITORY_ROOT"
        ? "Documentation repository root must be a directory"
        : "Documentation content root src/pages must be a directory",
      null,
    );
  }
}

async function assertContentRootIsContained(
  repositoryRoot: string,
  contentRoot: string,
): Promise<void> {
  let canonicalRepositoryRoot;
  let canonicalContentRoot;

  try {
    [canonicalRepositoryRoot, canonicalContentRoot] = await Promise.all([
      realpath(repositoryRoot),
      realpath(contentRoot),
    ]);
  } catch (error) {
    throw new DocumentationIngestionError(
      "READ_FAILED",
      "Unable to resolve documentation checkout paths",
      null,
      error,
    );
  }

  const relativePath = path.relative(
    canonicalRepositoryRoot,
    canonicalContentRoot,
  );

  if (
    path.isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`)
  ) {
    throw new DocumentationIngestionError(
      "UNSAFE_PATH",
      "Documentation content root resolves outside the repository checkout",
      null,
    );
  }
}

async function walkDocumentationDirectory(
  directory: string,
  contentRoot: string,
  revision: DocumentationRevision,
  maxFileBytes: number,
  signal: AbortSignal | undefined,
  committedPaths: ReadonlySet<string>,
  loadedFiles: LoadedDocumentationFile[],
): Promise<void> {
  abortIfRequested(signal, null);

  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new DocumentationIngestionError(
      "READ_FAILED",
      "Unable to enumerate documentation content",
      null,
      error,
    );
  }

  abortIfRequested(signal, null);
  entries.sort((left, right) => compareAscii(left.name, right.name));

  for (const entry of entries) {
    abortIfRequested(signal, null);

    const absolutePath = path.join(directory, entry.name);
    const repositoryPath = toRepositoryPath(contentRoot, absolutePath);

    let stats;
    try {
      stats = await lstat(absolutePath);
    } catch (error) {
      throw new DocumentationIngestionError(
        "READ_FAILED",
        "Unable to inspect a documentation entry",
        repositoryPath,
        error,
      );
    }

    if (stats.isSymbolicLink()) {
      throw new DocumentationIngestionError(
        "SYMLINK_NOT_ALLOWED",
        "Symbolic links are not allowed in the documentation corpus",
        repositoryPath,
      );
    }

    if (stats.isDirectory()) {
      await walkDocumentationDirectory(
        absolutePath,
        contentRoot,
        revision,
        maxFileBytes,
        signal,
        committedPaths,
        loadedFiles,
      );
      continue;
    }

    if (!stats.isFile() || !entry.name.endsWith(".mdx")) {
      continue;
    }

    if (!committedPaths.has(repositoryPath)) {
      throw new DocumentationIngestionError(
        "SOURCE_CHECKOUT_DIRTY",
        "Documentation source is not present in the requested revision",
        repositoryPath,
      );
    }

    if (stats.size > maxFileBytes) {
      throw new DocumentationIngestionError(
        "FILE_TOO_LARGE",
        `Documentation file exceeds the ${maxFileBytes}-byte ingestion limit`,
        repositoryPath,
      );
    }

    let rawMdx;
    try {
      rawMdx =
        signal === undefined
          ? await readFile(absolutePath, "utf8")
          : await readFile(absolutePath, { encoding: "utf8", signal });
    } catch (error) {
      if (
        signal?.aborted === true ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw new DocumentationIngestionError(
          "ABORTED",
          "Documentation ingestion was cancelled",
          repositoryPath,
          signal?.reason ?? error,
        );
      }

      throw new DocumentationIngestionError(
        "READ_FAILED",
        "Unable to read a documentation file",
        repositoryPath,
        error,
      );
    }

    abortIfRequested(signal, repositoryPath);

    loadedFiles.push({
      repositoryPath,
      revision,
      contentHash: createDocumentationContentHash(rawMdx),
      rawMdx,
    });
  }
}

export async function loadDocumentationFiles(
  options: LoadDocumentationFilesOptions,
): Promise<readonly LoadedDocumentationFile[]> {
  if (
    options.repositoryRoot.length === 0 ||
    options.repositoryRoot.includes("\0") ||
    !path.isAbsolute(options.repositoryRoot)
  ) {
    throw new DocumentationIngestionError(
      "INVALID_REPOSITORY_ROOT",
      "Documentation repository root must be an explicit absolute path",
      null,
    );
  }

  let revision;
  try {
    revision = parseDocumentationRevision(options.revision);
  } catch (error) {
    throw new DocumentationIngestionError(
      "INVALID_REVISION",
      "Documentation revision must be a full 40-character Git commit hash",
      null,
      error,
    );
  }

  const maxFileBytes =
    options.maxFileBytes ?? DEFAULT_MAX_DOCUMENTATION_FILE_BYTES;

  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes <= 0) {
    throw new DocumentationIngestionError(
      "INVALID_MAX_FILE_SIZE",
      "Documentation file-size limit must be a positive safe integer",
      null,
    );
  }

  abortIfRequested(options.signal, null);

  const repositoryRoot = path.resolve(options.repositoryRoot);
  const sourceRoot = path.join(repositoryRoot, "src");
  const contentRoot = path.join(sourceRoot, "pages");

  await requireDirectory(
    repositoryRoot,
    "REPOSITORY_NOT_FOUND",
    "INVALID_REPOSITORY_ROOT",
  );
  await requireDirectory(
    sourceRoot,
    "CONTENT_ROOT_NOT_FOUND",
    "CONTENT_ROOT_NOT_FOUND",
  );
  await requireDirectory(
    contentRoot,
    "CONTENT_ROOT_NOT_FOUND",
    "CONTENT_ROOT_NOT_FOUND",
  );
  await assertContentRootIsContained(repositoryRoot, contentRoot);

  await requireExactGitWorktree(repositoryRoot, options.signal);
  await requireHeadRevision(repositoryRoot, revision, options.signal);
  await requireCleanSourceCheckout(repositoryRoot, options.signal);
  const committedPaths = await listCommittedDocumentationPaths(
    repositoryRoot,
    options.signal,
  );

  const loadedFiles: LoadedDocumentationFile[] = [];

  await walkDocumentationDirectory(
    contentRoot,
    contentRoot,
    revision,
    maxFileBytes,
    options.signal,
    committedPaths,
    loadedFiles,
  );

  abortIfRequested(options.signal, null);
  await requireCleanSourceCheckout(repositoryRoot, options.signal);
  await requireHeadRevision(repositoryRoot, revision, options.signal);

  loadedFiles.sort((left, right) =>
    compareAscii(left.repositoryPath, right.repositoryPath),
  );

  return loadedFiles;
}
