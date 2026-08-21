import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const OFFICIAL_REPOSITORY_URL = "https://github.com/liara-cloud/docs.git";
const GENERATED_DIRECTORY = ".liara-docs";
const REVISION_PATTERN = /^[a-f0-9]{40}$/iu;
const GIT_TIMEOUT_MS = 120_000;

function fail(message) {
  throw new Error(`[liara-docs] ${message}`);
}

function runGit(repositoryRoot, arguments_) {
  try {
    return execFileSync("git", arguments_, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: 4 * 1_048_576,
    }).trim();
  } catch {
    fail("Git could not prepare or verify the official documentation checkout.");
  }
}

function verifyCheckout(repositoryRoot, revision) {
  if (runGit(repositoryRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    fail("The documentation path is not a Git worktree.");
  }

  const head = runGit(repositoryRoot, ["rev-parse", "HEAD"]).toLowerCase();
  if (head !== revision) {
    fail("The documentation checkout does not match LIARA_DOCS_REVISION.");
  }

  const changes = runGit(repositoryRoot, [
    "status",
    "--porcelain=v1",
    "--untracked-files=no",
    "--",
    "src/pages",
  ]);
  if (changes.length > 0) {
    fail("Tracked Liara documentation sources are not clean.");
  }
}

const revision = process.env.LIARA_DOCS_REVISION?.trim().toLowerCase() ?? "";
if (!REVISION_PATTERN.test(revision)) {
  fail("LIARA_DOCS_REVISION must be a full 40-character Git commit hash.");
}

const configuredPath = process.env.LIARA_DOCS_REPOSITORY_PATH?.trim();
const repositoryRoot = configuredPath
  ? path.resolve(configuredPath)
  : path.join(process.cwd(), GENERATED_DIRECTORY);

if (!existsSync(repositoryRoot)) {
  if (configuredPath) {
    fail("LIARA_DOCS_REPOSITORY_PATH does not exist.");
  }

  mkdirSync(repositoryRoot);
  runGit(repositoryRoot, ["init", "--quiet"]);
  runGit(repositoryRoot, ["remote", "add", "origin", OFFICIAL_REPOSITORY_URL]);
  runGit(repositoryRoot, ["fetch", "--quiet", "--depth=1", "origin", revision]);
  runGit(repositoryRoot, ["checkout", "--quiet", "--detach", "FETCH_HEAD"]);
}

verifyCheckout(repositoryRoot, revision);
console.info(`[liara-docs] Ready at revision ${revision}.`);
