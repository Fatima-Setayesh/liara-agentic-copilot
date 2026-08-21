import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  RetrievalConfigurationError,
  loadRuntimeRetrievalConfig,
} from "./runtime";

describe("runtime retrieval configuration", () => {
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
});
