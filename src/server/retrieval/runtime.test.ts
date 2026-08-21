import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_RUNTIME_DOCUMENTATION_DIRECTORY,
  RetrievalConfigurationError,
  loadRuntimeRetrievalConfig,
} from "./runtime";

describe("runtime retrieval configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an absolute checkout and a full revision", () => {
    const repositoryRoot = path.resolve("test-liara-docs");
    const config = loadRuntimeRetrievalConfig({
      LIARA_DOCS_REPOSITORY_PATH: repositoryRoot,
      LIARA_DOCS_REVISION: "A".repeat(40),
    });

    expect(config).toEqual({
      repositoryRoot,
      revision: "a".repeat(40),
    });
  });

  it("rejects incomplete runtime retrieval settings", () => {
    expect(() => loadRuntimeRetrievalConfig({})).toThrow(
      RetrievalConfigurationError,
    );
  });

  it("uses the build-prepared checkout when no development path is set", () => {
    const config = loadRuntimeRetrievalConfig({
      LIARA_DOCS_REVISION: "b".repeat(40),
    });

    expect(config).toEqual({
      repositoryRoot: path.resolve(DEFAULT_RUNTIME_DOCUMENTATION_DIRECTORY),
      revision: "b".repeat(40),
    });
  });

  it("rejects a relative development checkout override", () => {
    expect(() =>
      loadRuntimeRetrievalConfig({
        LIARA_DOCS_REPOSITORY_PATH: "../liara-docs",
        LIARA_DOCS_REVISION: "c".repeat(40),
      }),
    ).toThrow(RetrievalConfigurationError);
  });

  it("always uses the statically scoped project corpus in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const config = loadRuntimeRetrievalConfig({
      LIARA_DOCS_REPOSITORY_PATH: path.resolve("developer-checkout"),
      LIARA_DOCS_REVISION: "d".repeat(40),
    });

    expect(config.repositoryRoot).toBe(
      path.join(process.cwd(), DEFAULT_RUNTIME_DOCUMENTATION_DIRECTORY),
    );
  });
});
