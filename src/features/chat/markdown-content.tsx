"use client";

import { Check, Copy } from "lucide-react";
import { Fragment, ReactNode, useState } from "react";

import styles from "./chat-workspace.module.css";
import { getTextDirection } from "./text-direction";

type MarkdownContentProps = {
  content: string;
};

type MarkdownBlock =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language: string };

function splitMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const fencePattern = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;

  for (const match of content.matchAll(fencePattern)) {
    const index = match.index ?? 0;
    const language = match[1] ?? "";
    const code = match[2] ?? "";
    if (index > cursor) {
      blocks.push({ type: "text", content: content.slice(cursor, index) });
    }

    blocks.push({
      type: "code",
      language: language.trim() || "text",
      content: code.replace(/\n$/, ""),
    });
    cursor = index + match[0].length;
  }

  if (cursor < content.length) {
    blocks.push({ type: "text", content: content.slice(cursor) });
  }

  return blocks;
}

function renderInlineMarkdown(content: string): ReactNode[] {
  return content
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code dir="ltr" key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${part}-${index}`}>{renderTechnicalText(part.slice(2, -2))}</strong>;
      }

      return <Fragment key={`${part}-${index}`}>{renderTechnicalText(part)}</Fragment>;
    });
}

const TECHNICAL_TEXT_PATTERN = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|[a-zA-Z]:\\[^\s]+|(?:\/[\w.@~:+-]+){1,}|\b\d{1,3}(?:\.\d{1,3}){3}\b)/g;
const TECHNICAL_SEGMENT_PATTERN = /^(?:https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|[a-zA-Z]:\\[^\s]+|(?:\/[\w.@~:+-]+){1,}|\d{1,3}(?:\.\d{1,3}){3})$/;

function renderTechnicalText(content: string): ReactNode[] {
  return content.split(TECHNICAL_TEXT_PATTERN).filter(Boolean).map((part, index) => (
    TECHNICAL_SEGMENT_PATTERN.test(part)
      ? <bdi dir="ltr" key={`${part}-${index}`}>{part}</bdi>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>
  ));
}

function TextBlock({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ordered" | "unordered" = "unordered";

  function flushList() {
    if (listItems.length === 0) return;
    const List = listType === "ordered" ? "ol" : "ul";
    elements.push(
      <List dir={getTextDirection(listItems.join(" "))} key={`list-${elements.length}`}>
        {listItems.map((item, index) => (
          <li dir={getTextDirection(item)} key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </List>,
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      const nextType = orderedItem ? "ordered" : "unordered";
      if (listItems.length > 0 && listType !== nextType) flushList();
      listType = nextType;
      const item = orderedItem?.[1] ?? unorderedItem?.[1];
      if (item) listItems.push(item);
      return;
    }

    flushList();
    if (!trimmed) return;

    if (trimmed.startsWith("### ")) {
      const heading = trimmed.slice(4);
      elements.push(<h4 dir={getTextDirection(heading)} key={`heading-${index}`}>{renderInlineMarkdown(heading)}</h4>);
      return;
    }

    elements.push(<p dir={getTextDirection(trimmed)} key={`paragraph-${index}`}>{renderInlineMarkdown(trimmed)}</p>);
  });

  flushList();
  return elements;
}

export function CodeBlock({
  content,
  language,
  label,
}: {
  content: string;
  language: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={styles.codeBlock} dir="ltr">
      <div className={styles.codeHeader}>
        <span>{label ?? language}</span>
        <button type="button" onClick={copyCode} aria-label="Copy code block">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre dir="ltr"><code dir="ltr">{content}</code></pre>
    </div>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className={styles.markdownContent} dir={getTextDirection(content)}>
      {splitMarkdownBlocks(content).map((block, index) => (
        block.type === "code" ? (
          <CodeBlock content={block.content} language={block.language} key={`code-${index}`} />
        ) : (
          <TextBlock content={block.content} key={`text-${index}`} />
        )
      ))}
    </div>
  );
}
