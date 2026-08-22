import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent bidirectional rendering", () => {
  it("keeps Persian prose RTL while isolating technical content as LTR", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content={"### راه‌اندازی\nبرای بررسی `curl` را روی https://docs.liara.ir اجرا کنید.\n1. مسیر `/api/chat` را بررسی کنید."} />,
    );

    expect(html).toContain('<h4 dir="rtl">');
    expect(html).toContain('<p dir="rtl">');
    expect(html).toContain('<code dir="ltr">curl</code>');
    expect(html).toContain('<bdi dir="ltr">https://docs.liara.ir</bdi>');
    expect(html).toContain('<ol dir="rtl">');
    expect(html).toContain('<code dir="ltr">/api/chat</code>');
  });

  it("keeps English prose and fenced code LTR", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content={"Deploy the app.\n```json\n{\"port\": 3000}\n```"} />,
    );

    expect(html).toContain('<p dir="ltr">Deploy the app.</p>');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('{&quot;port&quot;: 3000}');
  });
});
