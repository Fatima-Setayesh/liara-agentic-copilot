import { describe, expect, it } from "vitest";

import { ACCENT_THEMES, isAccentTheme } from "./use-accent-theme";

describe("accent theme values", () => {
  it("keeps the existing themes and adds Liara White", () => {
    expect(ACCENT_THEMES).toEqual(["cyan", "violet", "blue", "orange", "white"]);
  });

  it("accepts persisted current themes and rejects unknown values", () => {
    for (const theme of ACCENT_THEMES) expect(isAccentTheme(theme)).toBe(true);
    expect(isAccentTheme("teal")).toBe(false);
    expect(isAccentTheme(null)).toBe(false);
  });
});
