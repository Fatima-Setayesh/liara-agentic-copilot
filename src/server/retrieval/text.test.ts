import { describe, expect, it } from "vitest";

import {
  analyzeLexicalText,
  countTokenFrequencies,
  normalizeLexicalText,
  tokenSetJaccard,
  tokenizeLexicalText,
  uniqueLexicalTokens,
} from "./text";

describe("normalizeLexicalText", () => {
  it("normalizes Persian and Arabic character variants deterministically", () => {
    expect(normalizeLexicalText("عَرَبِي كِتابـخانه على می‌رود")).toBe(
      "عربی کتابخانه علی می رود",
    );
  });

  it("applies NFKC and locale-independent lowercase normalization", () => {
    expect(normalizeLexicalText("ＮＥＸＴ．ＪＳ LIARA.JSON")).toBe(
      "next.js liara.json",
    );
  });

  it("returns an empty value for empty or punctuation-only input", () => {
    expect(normalizeLexicalText("")).toBe("");
    expect(normalizeLexicalText("  --- … !!!  ")).toBe("");
    expect(tokenizeLexicalText("؟،؛")).toEqual([]);
  });
});

describe("tokenizeLexicalText", () => {
  it("preserves technical compounds and emits their components", () => {
    expect(tokenizeLexicalText("Next.js liara.json @Liara/CLI")).toEqual([
      "next.js",
      "next",
      "js",
      "nextjs",
      "liara.json",
      "liara",
      "json",
      "liarajson",
      "@liara/cli",
      "liara",
      "cli",
      "liaracli",
    ]);
  });

  it("freezes returned token collections", () => {
    const tokens = tokenizeLexicalText("Liara");
    const uniqueTokens = uniqueLexicalTokens(tokens);

    expect(Object.isFrozen(tokens)).toBe(true);
    expect(Object.isFrozen(uniqueTokens)).toBe(true);
  });
});

describe("lexical statistics", () => {
  it("counts deterministic frequencies and first-seen unique tokens", () => {
    const first = analyzeLexicalText("Liara liara NEXT.js next");
    const second = analyzeLexicalText("Liara liara NEXT.js next");

    expect(first).toEqual(second);
    expect(first.normalizedText).toBe("liara liara next.js next");
    expect(first.uniqueTokens).toEqual([
      "liara",
      "next.js",
      "next",
      "js",
      "nextjs",
    ]);
    expect(first.tokenFrequencies).toEqual({
      liara: 2,
      "next.js": 1,
      next: 2,
      js: 1,
      nextjs: 1,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.tokenFrequencies)).toBe(true);
  });

  it("exports frequency counting independently", () => {
    expect(countTokenFrequencies(["liara", "liara", "cli"])).toEqual({
      liara: 2,
      cli: 1,
    });
  });

  it("computes set Jaccard without counting duplicate tokens", () => {
    expect(
      tokenSetJaccard(
        ["liara", "next.js", "next", "next", "js"],
        ["liara", "next", "node"],
      ),
    ).toBeCloseTo(0.4);
    expect(tokenSetJaccard([], [])).toBe(1);
    expect(tokenSetJaccard([], ["liara"])).toBe(0);
  });
});
