import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { buildDocumentationCorpus } from "./corpus";

const executeFile = promisify(execFile);
const PLACEHOLDER_REVISION = "0000000000000000000000000000000000000000";
const temporaryRoots: string[] = [];

async function temporaryRepository(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "liara-retrieval-corpus-"));
  temporaryRoots.push(root);
  await mkdir(path.join(root, "src", "pages", "paas", "nodejs"), {
    recursive: true,
  });
  return root;
}

async function commitRepository(root: string): Promise<string> {
  const runGit = async (...arguments_: readonly string[]): Promise<string> => {
    const result = await executeFile("git", arguments_, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });

    return result.stdout;
  };

  await runGit("init", "--quiet");
  await runGit("config", "user.name", "Liara retrieval test");
  await runGit("config", "user.email", "retrieval-test@example.invalid");
  await runGit("add", "--all");
  await runGit("commit", "--quiet", "--message", "test corpus");

  return (await runGit("rev-parse", "HEAD")).trim();
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe("buildDocumentationCorpus", () => {
  it("builds a deterministic, citation-preserving corpus and records skips", async () => {
    const root = await temporaryRepository();
    await writeFile(
      path.join(root, "src", "pages", "paas", "nodejs", "guide.mdx"),
      `# راهنمای Node.js\n\nمتن رسمی.\n\n<Section id="deploy" title="استقرار" />\n\n<Highlight className="bash">{\`liara deploy\`}</Highlight>`,
      "utf8",
    );
    await writeFile(
      path.join(root, "src", "pages", "paas", "nodejs", "empty.mdx"),
      "",
      "utf8",
    );
    const revision = await commitRepository(root);

    const corpus = await buildDocumentationCorpus({
      repositoryRoot: root,
      revision,
    });

    expect(corpus.loadedFileCount).toBe(2);
    expect(corpus.documents).toHaveLength(1);
    expect(corpus.skippedFiles).toEqual([
      {
        repositoryPath: "src/pages/paas/nodejs/empty.mdx",
        reason: "empty_source",
      },
    ]);
    expect(corpus.chunks).toHaveLength(2);
    expect(corpus.chunks[1]).toMatchObject({
      title: "راهنمای Node.js",
      sectionHeading: "استقرار",
      anchor: "deploy",
      content: "```bash\nliara deploy\n```",
    });
    expect(corpus.chunks[1]?.source.repositoryUrl).toContain(`/blob/${revision}/`);
  });

  it("honors cancellation before normalization work continues", async () => {
    const root = await temporaryRepository();
    await writeFile(
      path.join(root, "src", "pages", "paas", "nodejs", "guide.mdx"),
      "# راهنما\n\nمتن",
      "utf8",
    );
    const controller = new AbortController();
    controller.abort(new DOMException("Stopped", "AbortError"));

    await expect(
      buildDocumentationCorpus({
        repositoryRoot: root,
        revision: PLACEHOLDER_REVISION,
        signal: controller.signal,
      }),
    ).rejects.toThrowError(/cancelled/u);
  });
});
