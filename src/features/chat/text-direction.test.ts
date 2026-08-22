import { describe, expect, it } from "vitest";

import { getTextDirection } from "./text-direction";

describe("getTextDirection", () => {
  it("detects Persian, Arabic, and Hebrew text as RTL", () => {
    expect(getTextDirection("سلام، چطور می‌توانم CDN بسازم؟")).toBe("rtl");
    expect(getTextDirection("كيف أنشر تطبيقي؟")).toBe("rtl");
    expect(getTextDirection("איך פורסים יישום?")).toBe("rtl");
  });

  it("detects Latin text as LTR", () => {
    expect(getTextDirection("How do I create a CDN on Liara?")).toBe("ltr");
  });

  it("uses the dominant script for mixed technical text", () => {
    expect(getTextDirection("چطور Next.js رو روی Liara دیپلوی کنم؟")).toBe("rtl");
    expect(getTextDirection("Use Liara برای deploy")).toBe("ltr");
  });

  it("defaults neutral and technical-only content to LTR", () => {
    expect(getTextDirection("/api/chat")).toBe("ltr");
    expect(getTextDirection("127.0.0.1")).toBe("ltr");
    expect(getTextDirection("12345")).toBe("ltr");
  });
});
