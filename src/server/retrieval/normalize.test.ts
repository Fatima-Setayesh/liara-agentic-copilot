import { describe, expect, it } from "vitest";

import {
  createDocumentationContentHash,
  parseDocumentationRevision,
} from "./identity";
import {
  DocumentationNormalizationError,
  normalizeDocumentationFile,
} from "./normalize";
import type { LoadedDocumentationFile } from "./types";

const REVISION = parseDocumentationRevision(
  "31f2ef7adce565341d7eba43492ef5b4f63a7d73",
);

function fixture(rawMdx: string): LoadedDocumentationFile {
  return {
    repositoryPath: "src/pages/paas/nextjs/getting-started.mdx",
    revision: REVISION,
    contentHash: createDocumentationContentHash(rawMdx),
    rawMdx,
  };
}

describe("normalizeDocumentationFile", () => {
  it("preserves document, section, citation, prose, and code identity", () => {
    const rawMdx = `
import Layout from "@/components/Layout";

<Layout>
  <Head>
    <title>راهنمای Next.js</title>
    <meta name="description" content="توضیح رسمی" />
  </Head>

  # استقرار Next.js

  متن معرفی.

  <Section id="deploy" title="استقرار" />

  برنامه را آماده کنید.

  <Highlight language="bash">{\`liara deploy\`}</Highlight>
</Layout>`;

    const result = normalizeDocumentationFile(fixture(rawMdx));

    expect(result.kind).toBe("document");
    if (result.kind !== "document") return;

    expect(result.document.title).toBe("استقرار Next.js");
    expect(result.document.description).toBe("توضیح رسمی");
    expect(result.document.source.publishedUrl).toBe(
      "https://docs.liara.ir/paas/nextjs/getting-started/",
    );
    expect(result.document.sections).toHaveLength(2);
    expect(result.document.sections[0]).toMatchObject({
      heading: null,
      headingPath: [],
      order: 0,
      blocks: [{ kind: "text", text: "متن معرفی.", language: null }],
    });
    expect(result.document.sections[1]).toMatchObject({
      heading: "استقرار",
      headingPath: ["استقرار"],
      anchor: "deploy",
      order: 1,
    });
    expect(result.document.sections[1]?.blocks).toContainEqual({
      kind: "code",
      text: "liara deploy",
      language: "bash",
    });
  });

  it("retains static Tabs, Step, and Table evidence without executing expressions", () => {
    const rawMdx = `
# اتصال
<Tabs tabs={["Node.js"]} content={[<>متن تب</>]} />
<Step steps={[{ step: "گام یک", content: <>محتوای گام</> }]} />
<Table headers={["نام", "توضیح"]} data={[["PORT", "درگاه برنامه"]]} />
{dangerousFunction()}
`;

    const result = normalizeDocumentationFile(fixture(rawMdx));
    expect(result.kind).toBe("document");
    if (result.kind !== "document") return;

    const content = result.document.sections
      .flatMap((section) => section.blocks)
      .map((block) => block.text)
      .join("\n");
    expect(content).toContain("Node.js");
    expect(content).toContain("متن تب");
    expect(content).toContain("گام یک");
    expect(content).toContain("محتوای گام");
    expect(content).toContain("PORT");
    expect(content).toContain("درگاه برنامه");
    expect(content).not.toContain("dangerousFunction");
    expect(result.document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "unsupported_dynamic_expression" }),
    );
  });

  it("retains HighlightTabs labels, languages, and code without evaluating icons", () => {
    const result = normalizeDocumentationFile(
      fixture(`# Email examples
<HighlightTabs
  tabs={[
    {
      label: "NodeJS",
      icon: <PlatformIcon platform="nodejs" />,
      language: "javascript",
      code: \`const recipient = \${process.env.MAIL_TO};\`,
    },
    {
      label: "Laravel",
      icon: <PlatformIcon platform="laravel" />,
      language: "php",
      code: \`Mail::to('info@example.com')->send($message);\`,
    },
  ]}
/>`),
    );
    expect(result.kind).toBe("document");
    if (result.kind !== "document") return;

    expect(result.document.sections[0]?.blocks).toEqual([
      { kind: "text", text: "Tab: NodeJS", language: null },
      {
        kind: "code",
        text: "const recipient = ${process.env.MAIL_TO};",
        language: "javascript",
      },
      { kind: "text", text: "Tab: Laravel", language: null },
      {
        kind: "code",
        text: "Mail::to('info@example.com')->send($message);",
        language: "php",
      },
    ]);
    expect(result.document.diagnostics).toEqual([]);
  });

  it("preserves TickIcon and empty table cells without shifting columns", () => {
    const result = normalizeDocumentationFile(
      fixture(`# Permissions
<Table
  headers={["Permission", "View", "Deploy", "Manage"]}
  data={[
    ["List apps", <TickIcon />, <TickIcon />, <TickIcon />],
    ["Delete", "", "", <TickIcon />],
  ]}
/>`),
    );
    expect(result.kind).toBe("document");
    if (result.kind !== "document") return;

    expect(result.document.sections[0]?.blocks).toEqual([
      {
        kind: "text",
        text: "Permission | View | Deploy | Manage",
        language: null,
      },
      {
        kind: "text",
        text: "List apps | ✓ | ✓ | ✓",
        language: null,
      },
      {
        kind: "text",
        text: "Delete | — | — | ✓",
        language: null,
      },
    ]);
  });

  it("retains static QuestionBox evidence", () => {
    const result = normalizeDocumentationFile(
      fixture(`# پرسش‌ها
<QuestionBox
  id="memory"
  question="آیا حافظه پیش‌فرض است؟"
  answer={<><p>خیر، تاریخچه باید توسط برنامه مدیریت شود.</p></>}
/>`),
    );
    expect(result.kind).toBe("document");
    if (result.kind !== "document") return;

    expect(result.document.sections[0]).toMatchObject({
      heading: "آیا حافظه پیش‌فرض است؟",
      anchor: "memory",
    });
    const content = result.document.sections[0]?.blocks
      .map((block) => block.text)
      .join("\n");
    expect(content).toContain("تاریخچه باید توسط برنامه مدیریت شود");
  });

  it("omits duplicate source anchors instead of creating ambiguous citations", () => {
    const result = normalizeDocumentationFile(
      fixture(`# راهنما
<Section id="same" title="اول" />
متن اول.
<Section id="same" title="دوم" />
متن دوم.`),
    );
    expect(result.kind).toBe("document");
    if (result.kind !== "document") return;

    expect(result.document.sections.map((section) => section.anchor)).toEqual([
      "same",
      null,
    ]);
    expect(result.document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "duplicate_section_anchor" }),
    );
  });

  it("skips whitespace-only and evidence-free documents explicitly", () => {
    expect(normalizeDocumentationFile(fixture(" \n\t"))).toMatchObject({
      kind: "skipped",
      reason: "empty_source",
    });
    expect(normalizeDocumentationFile(fixture('import X from "x";'))).toMatchObject({
      kind: "skipped",
      reason: "no_retrievable_content",
    });
  });

  it("wraps malformed MDX as a typed ingestion failure", () => {
    expect(() => normalizeDocumentationFile(fixture("# title\n<Broken>"))).toThrow(
      DocumentationNormalizationError,
    );
  });

  it("propagates cancellation instead of disguising it as parse failure", () => {
    const controller = new AbortController();
    controller.abort(new DOMException("Stopped", "AbortError"));

    expect(() =>
      normalizeDocumentationFile(fixture("# title\ncontent"), {
        signal: controller.signal,
      }),
    ).toThrowError(/Stopped/u);
  });
});
