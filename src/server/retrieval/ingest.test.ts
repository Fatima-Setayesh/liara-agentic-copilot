import { execFile, spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDocumentationContentHash } from "./identity";
import {
  DocumentationIngestionError,
  loadDocumentationFiles,
} from "./ingest";

const executeFile = promisify(execFile);
const GIT_AVAILABLE =
  spawnSync("git", ["--version"], {
    stdio: "ignore",
    windowsHide: true,
  }).status === 0;
const DIFFERENT_REVISION = "0000000000000000000000000000000000000000";

describe.skipIf(!GIT_AVAILABLE)(
  "documentation checkout ingestion",
  { timeout: 20_000 },
  () => {
  let repositoryRoot: string;

  beforeEach(async () => {
    repositoryRoot = await mkdtemp(
      path.join(tmpdir(), "liara-retrieval-ingest-"),
    );
  });

  afterEach(async () => {
    await rm(repositoryRoot, { recursive: true, force: true });
  });

  async function writeRepositoryFile(
    repositoryPath: string,
    content: string,
  ): Promise<void> {
    const absolutePath = path.join(repositoryRoot, ...repositoryPath.split("/"));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }

  async function runGit(...arguments_: readonly string[]): Promise<string> {
    const result = await executeFile("git", arguments_, {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
    });

    return result.stdout;
  }

  async function commitRepository(
    message = "test documentation checkout",
  ): Promise<string> {
    await runGit("init", "--quiet");
    await runGit("config", "user.name", "Liara retrieval test");
    await runGit("config", "user.email", "retrieval-test@example.invalid");
    await runGit("add", "--all");
    await runGit("commit", "--quiet", "--message", message);

    return (await runGit("rev-parse", "HEAD")).trim();
  }

  it("loads only src/pages MDX files in deterministic path order", async () => {
    await writeRepositoryFile("src/pages/paas/nodejs/zeta.mdx", "# Zeta\n");
    await writeRepositoryFile("src/pages/ai/about.mdx", "# AI\n");
    await writeRepositoryFile("src/pages/paas/nodejs/alpha.mdx", "# Alpha\n");
    await writeRepositoryFile("src/pages/paas/nodejs/empty.mdx", "");
    await writeRepositoryFile("src/pages/index.js", "export default function Page() {}\n");
    await writeRepositoryFile(
      "public/llms/paas/nodejs/zeta.md",
      "Generated and non-authoritative\n",
    );
    const revision = await commitRepository();

    const files = await loadDocumentationFiles({
      repositoryRoot,
      revision,
    });

    expect(files.map((file) => file.repositoryPath)).toEqual([
      "src/pages/ai/about.mdx",
      "src/pages/paas/nodejs/alpha.mdx",
      "src/pages/paas/nodejs/empty.mdx",
      "src/pages/paas/nodejs/zeta.mdx",
    ]);
    expect(files[2]).toMatchObject({
      rawMdx: "",
      contentHash: createDocumentationContentHash(""),
      revision,
    });
  });

  it("rejects a revision that is not a full commit hash", async () => {
    await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");

    await expect(
      loadDocumentationFiles({ repositoryRoot, revision: "master" }),
    ).rejects.toMatchObject({
      name: "DocumentationIngestionError",
      code: "INVALID_REVISION",
    });
  });

  it("requires an explicit absolute repository root", async () => {
    await expect(
      loadDocumentationFiles({
        repositoryRoot: "relative/docs-checkout",
        revision: DIFFERENT_REVISION,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_REPOSITORY_ROOT",
    });
  });

  it("reports a missing src/pages content root as a typed error", async () => {
    await expect(
      loadDocumentationFiles({
        repositoryRoot,
        revision: DIFFERENT_REVISION,
      }),
    ).rejects.toMatchObject({
      code: "CONTENT_ROOT_NOT_FOUND",
    });
  });

  it("enforces the configured maximum source-file size", async () => {
    await writeRepositoryFile("src/pages/paas/about.mdx", "12345");
    const revision = await commitRepository();

    await expect(
      loadDocumentationFiles({
        repositoryRoot,
        revision,
        maxFileBytes: 4,
      }),
    ).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
      repositoryPath: "src/pages/paas/about.mdx",
    });
  });

  it("propagates cancellation as a typed ingestion outcome", async () => {
    await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");
    const controller = new AbortController();
    controller.abort(new Error("caller cancelled"));

    await expect(
      loadDocumentationFiles({
        repositoryRoot,
        revision: DIFFERENT_REVISION,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      code: "ABORTED",
    });
  });

  it("rejects symlinks instead of following them outside the corpus", async () => {
    await writeRepositoryFile("outside/escape.mdx", "# Escape\n");
    await writeRepositoryFile("src/pages/about.mdx", "# About\n");
    const revision = await commitRepository();

    const target = path.join(repositoryRoot, "outside");
    const link = path.join(repositoryRoot, "src", "pages", "linked");

    try {
      await symlink(
        target,
        link,
        process.platform === "win32" ? "junction" : "dir",
      );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "EPERM" || error.code === "EACCES")
      ) {
        return;
      }

      throw error;
    }

    await expect(
      loadDocumentationFiles({ repositoryRoot, revision }),
    ).rejects.toMatchObject({
      code: "SYMLINK_NOT_ALLOWED",
      repositoryPath: "src/pages/linked",
    });
  });

  it("exposes typed ingestion errors", async () => {
    try {
      await loadDocumentationFiles({
        repositoryRoot,
        revision: DIFFERENT_REVISION,
      });
      throw new Error("Expected ingestion to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentationIngestionError);
    }
  });

  it("rejects a directory that is not a Git worktree", async () => {
    await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");

    await expect(
      loadDocumentationFiles({
        repositoryRoot,
        revision: DIFFERENT_REVISION,
      }),
    ).rejects.toMatchObject({
      code: "NOT_GIT_WORKTREE",
    });
  });

  it("requires the repository root to be the exact Git worktree root", async () => {
    await writeRepositoryFile(
      "nested/src/pages/paas/about.mdx",
      "# Nested PaaS\n",
    );
    const revision = await commitRepository();

    await expect(
      loadDocumentationFiles({
        repositoryRoot: path.join(repositoryRoot, "nested"),
        revision,
      }),
    ).rejects.toMatchObject({
      code: "NOT_GIT_WORKTREE",
    });
  });

  it("rejects a checkout whose HEAD differs from the requested revision", async () => {
    await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");
    await commitRepository();

    await expect(
      loadDocumentationFiles({
        repositoryRoot,
        revision: DIFFERENT_REVISION,
      }),
    ).rejects.toMatchObject({
      code: "REVISION_MISMATCH",
    });
  });

  it.each([false, true])(
    "rejects %s tracked documentation changes",
    async (staged) => {
      await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");
      const revision = await commitRepository();
      await writeRepositoryFile(
        "src/pages/paas/about.mdx",
        "# Locally changed PaaS\n",
      );

      if (staged) {
        await runGit("add", "src/pages/paas/about.mdx");
      }

      await expect(
        loadDocumentationFiles({ repositoryRoot, revision }),
      ).rejects.toMatchObject({
        code: "SOURCE_CHECKOUT_DIRTY",
      });
    },
  );

  it("rejects an ignored MDX file absent from the requested revision", async () => {
    await writeRepositoryFile(
      ".gitignore",
      "/src/pages/generated-local.mdx\n",
    );
    await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");
    const revision = await commitRepository();
    await writeRepositoryFile(
      "src/pages/generated-local.mdx",
      "# Local-only documentation\n",
    );

    await expect(
      loadDocumentationFiles({ repositoryRoot, revision }),
    ).rejects.toMatchObject({
      code: "SOURCE_CHECKOUT_DIRTY",
      repositoryPath: "src/pages/generated-local.mdx",
    });
  });

  it("allows unrelated working-tree changes outside retrieval inputs", async () => {
    await writeRepositoryFile("src/pages/paas/about.mdx", "# PaaS\n");
    await writeRepositoryFile("README.md", "Original\n");
    const revision = await commitRepository();
    await writeRepositoryFile("README.md", "Unrelated local change\n");

    await expect(
      loadDocumentationFiles({ repositoryRoot, revision }),
    ).resolves.toHaveLength(1);
  });
  },
);
