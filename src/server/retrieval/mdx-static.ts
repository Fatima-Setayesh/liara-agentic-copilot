import { unified } from "unified";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";

import type {
  NormalizationDiagnostic,
  NormalizationSourcePosition,
  NormalizedBlock,
} from "./types";

const MAX_DIAGNOSTICS_PER_DOCUMENT = 100;
const TABLE_AFFIRMATIVE_MARKER = "✓";
const TABLE_EMPTY_MARKER = "—";
const VISIBLE_OBJECT_PROPERTIES = new Set([
  "body",
  "command",
  "content",
  "description",
  "example",
  "head",
  "label",
  "name",
  "step",
  "text",
  "title",
]);

interface AstPoint {
  readonly line?: number;
  readonly column?: number;
  readonly offset?: number;
}

interface AstPosition {
  readonly start?: AstPoint;
}

interface AstExpressionValue {
  readonly type?: string;
  readonly data?: {
    readonly estree?: unknown;
  };
}

interface AstAttribute {
  readonly type?: string;
  readonly name?: string;
  readonly value?: string | AstExpressionValue | null;
}

interface AstNode {
  readonly type: string;
  readonly value?: string;
  readonly depth?: number;
  readonly name?: string | null;
  readonly url?: string;
  readonly alt?: string | null;
  readonly lang?: string | null;
  readonly ordered?: boolean | null;
  readonly start?: number;
  readonly end?: number;
  readonly children?: readonly AstNode[];
  readonly attributes?: readonly AstAttribute[];
  readonly data?: {
    readonly estree?: unknown;
  };
  readonly position?: AstPosition;
}

export type ExtractedMdxItem =
  | {
      readonly kind: "heading";
      readonly depth: number;
      readonly text: string;
      readonly position: NormalizationSourcePosition | null;
    }
  | {
      readonly kind: "section";
      readonly heading: string;
      readonly anchor: string | null;
      readonly position: NormalizationSourcePosition | null;
    }
  | {
      readonly kind: "blocks";
      readonly blocks: readonly NormalizedBlock[];
    };

export interface ExtractedMdxDocument {
  readonly headTitle: string | null;
  readonly headDescription: string | null;
  readonly items: readonly ExtractedMdxItem[];
  readonly diagnostics: readonly NormalizationDiagnostic[];
}

interface ExtractionContext {
  readonly source: string;
  readonly diagnostics: NormalizationDiagnostic[];
}

type EstreeNode = Readonly<Record<string, unknown>> & {
  readonly type: string;
};

const parser = unified().use(remarkParse).use(remarkMdx);

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function asNode(value: unknown): EstreeNode | null {
  const record = asRecord(value);
  return record && typeof record.type === "string"
    ? (record as EstreeNode)
    : null;
}

function nodeType(value: unknown): string | null {
  const node = asNode(value);
  return node?.type ?? null;
}

function childArray(value: unknown, key: string): readonly unknown[] {
  const record = asRecord(value);
  const children = record?.[key];
  return Array.isArray(children) ? children : [];
}

function positionFromNode(node: AstNode): NormalizationSourcePosition | null {
  const start = node.position?.start;
  if (!start || typeof start.line !== "number" || typeof start.column !== "number") {
    return null;
  }

  return {
    line: start.line,
    column: start.column,
    offset: typeof start.offset === "number" ? start.offset : null,
  };
}

function addDiagnostic(
  context: ExtractionContext,
  code: string,
  message: string,
  position: NormalizationSourcePosition | null,
): void {
  if (context.diagnostics.length >= MAX_DIAGNOSTICS_PER_DOCUMENT) {
    if (
      context.diagnostics.length === MAX_DIAGNOSTICS_PER_DOCUMENT &&
      !context.diagnostics.some(
        (diagnostic) => diagnostic.code === "diagnostic_limit_reached",
      )
    ) {
      context.diagnostics.push({
        code: "diagnostic_limit_reached",
        message: "Additional normalization diagnostics were omitted.",
        position: null,
      });
    }
    return;
  }

  context.diagnostics.push({ code, message, position });
}

function normalizeProse(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeCode(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/^\n/, "")
    .replace(/\n[\t ]*$/, "")
    .trimEnd();
}

function textBlock(text: string): NormalizedBlock | null {
  const normalized = normalizeProse(text);
  return normalized ? { kind: "text", text: normalized, language: null } : null;
}

function codeBlock(text: string, language: string | null): NormalizedBlock | null {
  const normalized = normalizeCode(text);
  return normalized ? { kind: "code", text: normalized, language } : null;
}

function compactBlocks(blocks: readonly NormalizedBlock[]): readonly NormalizedBlock[] {
  const compacted: NormalizedBlock[] = [];

  for (const block of blocks) {
    const normalized =
      block.kind === "code"
        ? codeBlock(block.text, block.language)
        : textBlock(block.text);

    if (!normalized) {
      continue;
    }

    const previous = compacted.at(-1);
    if (
      previous?.kind === "text" &&
      normalized.kind === "text" &&
      previous.text === normalized.text
    ) {
      continue;
    }

    compacted.push(normalized);
  }

  return compacted;
}

function astAttribute(node: AstNode, name: string): AstAttribute | null {
  return (
    node.attributes?.find(
      (attribute) => attribute.type === "mdxJsxAttribute" && attribute.name === name,
    ) ?? null
  );
}

function astLiteralAttribute(node: AstNode, name: string): string | null {
  const value = astAttribute(node, name)?.value;
  return typeof value === "string" ? value : null;
}

function expressionFromProgram(value: unknown): unknown {
  const program = asNode(value);
  if (!program || program.type !== "Program") {
    return null;
  }

  const statement = childArray(program, "body").at(0);
  const statementRecord = asNode(statement);
  return statementRecord?.type === "ExpressionStatement"
    ? statementRecord.expression
    : null;
}

function astAttributeExpression(node: AstNode, name: string): unknown {
  const value = astAttribute(node, name)?.value;
  return typeof value === "object" && value !== null
    ? expressionFromProgram(value.data?.estree)
    : null;
}

function estreeIdentifierName(value: unknown): string | null {
  const record = asNode(value);
  if (!record) {
    return null;
  }

  if (record.type === "JSXIdentifier" || record.type === "Identifier") {
    return typeof record.name === "string" ? record.name : null;
  }

  if (record.type === "JSXMemberExpression") {
    const objectName = estreeIdentifierName(record.object);
    const propertyName = estreeIdentifierName(record.property);
    return objectName && propertyName ? `${objectName}.${propertyName}` : null;
  }

  return null;
}

function estreeAttribute(
  openingElement: Readonly<Record<string, unknown>>,
  name: string,
): Readonly<Record<string, unknown>> | null {
  for (const attribute of childArray(openingElement, "attributes")) {
    const record = asNode(attribute);
    if (
      record?.type === "JSXAttribute" &&
      estreeIdentifierName(record.name) === name
    ) {
      return record;
    }
  }

  return null;
}

function estreeAttributeLiteral(
  openingElement: Readonly<Record<string, unknown>>,
  name: string,
): string | null {
  const value = estreeAttribute(openingElement, name)?.value;
  const record = asNode(value);
  if (!record) {
    return null;
  }

  if (record.type === "Literal" && typeof record.value === "string") {
    return record.value;
  }

  return null;
}

function estreeAttributeExpression(
  openingElement: Readonly<Record<string, unknown>>,
  name: string,
): unknown {
  const value = asNode(estreeAttribute(openingElement, name)?.value);
  return value?.type === "JSXExpressionContainer" ? value.expression : null;
}

function safeLinkTarget(value: string): string | null {
  const trimmed = value.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? trimmed : null;
  } catch {
    return null;
  }
}

function rawTemplateLiteral(value: unknown, context: ExtractionContext): string | null {
  const node = asNode(value);
  if (node?.type !== "TemplateLiteral") {
    return null;
  }

  const start = node.start;
  const end = node.end;
  if (
    typeof start === "number" &&
    typeof end === "number" &&
    context.source[start] === "`" &&
    context.source[end - 1] === "`"
  ) {
    return context.source.slice(start + 1, end - 1);
  }

  const values: string[] = [];
  for (const quasi of childArray(node, "quasis")) {
    const quasiRecord = asRecord(quasi);
    const cooked = asRecord(quasiRecord?.value)?.cooked;
    if (typeof cooked === "string") {
      values.push(cooked);
    }
  }

  return values.length > 0 ? values.join("") : null;
}

function plainTextFromBlocks(blocks: readonly NormalizedBlock[]): string {
  return normalizeProse(blocks.map((block) => block.text).join(" "));
}

function staticTextFromEstree(value: unknown, context: ExtractionContext): string {
  return plainTextFromBlocks(blocksFromEstree(value, context));
}

function arrayElements(value: unknown): readonly unknown[] {
  const node = asNode(value);
  return node?.type === "ArrayExpression" ? childArray(node, "elements") : [];
}

function objectProperty(
  value: unknown,
  propertyName: string,
): unknown {
  const node = asNode(value);
  if (node?.type !== "ObjectExpression") {
    return null;
  }

  for (const property of childArray(node, "properties")) {
    const record = asNode(property);
    if (record?.type !== "Property" || record.computed === true) {
      continue;
    }

    const key = estreeIdentifierName(record.key);
    const literalKey = asNode(record.key);
    const name =
      key ??
      (literalKey?.type === "Literal" && typeof literalKey.value === "string"
        ? literalKey.value
        : null);

    if (name === propertyName) {
      return record.value;
    }
  }

  return null;
}

function tabsBlocks(
  labelsExpression: unknown,
  contentExpression: unknown,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  const labels = arrayElements(labelsExpression).map((label) =>
    staticTextFromEstree(label, context),
  );
  const contents = arrayElements(contentExpression);
  const blocks: NormalizedBlock[] = [];

  contents.forEach((content, index) => {
    const label = labels.at(index);
    if (label) {
      const labelBlock = textBlock(`Tab: ${label}`);
      if (labelBlock) blocks.push(labelBlock);
    }
    blocks.push(...blocksFromEstree(content, context));
  });

  return compactBlocks(blocks);
}

function stepBlocks(value: unknown, context: ExtractionContext): readonly NormalizedBlock[] {
  const blocks: NormalizedBlock[] = [];

  for (const step of arrayElements(value)) {
    const label = staticTextFromEstree(objectProperty(step, "step"), context);
    const content = objectProperty(step, "content");
    if (label) {
      const labelBlock = textBlock(`Step ${label}`);
      if (labelBlock) blocks.push(labelBlock);
    }
    blocks.push(...blocksFromEstree(content, context));
  }

  return compactBlocks(blocks);
}

function highlightTabsBlocks(
  tabsExpression: unknown,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  const blocks: NormalizedBlock[] = [];

  for (const tab of arrayElements(tabsExpression)) {
    const label = staticTextFromEstree(objectProperty(tab, "label"), context);
    const language = staticTextFromEstree(
      objectProperty(tab, "language"),
      context,
    );
    const code = codeFromEstree(objectProperty(tab, "code"), context);

    const labelBlock = textBlock(label ? `Tab: ${label}` : "");
    if (labelBlock) blocks.push(labelBlock);

    const block = codeBlock(code ?? "", language || null);
    if (block) blocks.push(block);
  }

  return compactBlocks(blocks);
}

function tableCellText(value: unknown, context: ExtractionContext): string {
  return staticTextFromEstree(value, context) || TABLE_EMPTY_MARKER;
}

function tableBlocks(
  headersExpression: unknown,
  dataExpression: unknown,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  const blocks: NormalizedBlock[] = [];
  const headers = arrayElements(headersExpression).map((cell) =>
    tableCellText(cell, context),
  );

  if (headers.length > 0) {
    const header = textBlock(headers.join(" | "));
    if (header) blocks.push(header);
  }

  for (const row of arrayElements(dataExpression)) {
    const cells = arrayElements(row).map((cell) =>
      tableCellText(cell, context),
    );
    if (cells.length > 0) {
      const block = textBlock(cells.join(" | "));
      if (block) blocks.push(block);
    }
  }

  return compactBlocks(blocks);
}

function codeFromEstree(value: unknown, context: ExtractionContext): string | null {
  const node = asNode(value);
  if (!node) {
    return null;
  }

  if (node.type === "TemplateLiteral") {
    return rawTemplateLiteral(node, context);
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "JSXExpressionContainer") {
    return codeFromEstree(node.expression, context);
  }

  return null;
}

function estreeJsxBlocks(
  value: Readonly<Record<string, unknown>>,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  const openingElement = asNode(value.openingElement);
  if (!openingElement) {
    return [];
  }

  const name = estreeIdentifierName(openingElement.name);
  const children = childArray(value, "children");

  if (name === "Head") return [];
  if (name === "TickIcon") {
    const block = textBlock(TABLE_AFFIRMATIVE_MARKER);
    return block ? [block] : [];
  }
  if (name === "Tabs") {
    return tabsBlocks(
      estreeAttributeExpression(openingElement, "tabs"),
      estreeAttributeExpression(openingElement, "content"),
      context,
    );
  }
  if (name === "HighlightTabs") {
    return highlightTabsBlocks(
      estreeAttributeExpression(openingElement, "tabs"),
      context,
    );
  }
  if (name === "Step") {
    const steps = estreeAttributeExpression(openingElement, "steps");
    if (steps) return stepBlocks(steps, context);

    const blocks = children.flatMap((child) => blocksFromEstree(child, context));
    const title = estreeAttributeLiteral(openingElement, "title");
    const titleBlock = textBlock(title ?? "");
    return compactBlocks(titleBlock ? [titleBlock, ...blocks] : blocks);
  }
  if (name === "Table") {
    const headers = estreeAttributeExpression(openingElement, "headers");
    const data = estreeAttributeExpression(openingElement, "data");
    if (headers || data) return tableBlocks(headers, data, context);
    return blocksFromEstree(
      estreeAttributeExpression(openingElement, "content"),
      context,
    );
  }
  if (name === "QuestionBox") {
    const question = estreeAttributeLiteral(openingElement, "question");
    const questionBlock = textBlock(question ?? "");
    const answerBlocks = blocksFromEstree(
      estreeAttributeExpression(openingElement, "answer"),
      context,
    );
    return compactBlocks(
      questionBlock ? [questionBlock, ...answerBlocks] : answerBlocks,
    );
  }
  if (name === "Highlight") {
    const expressionContainer = children.find(
      (child) => nodeType(child) === "JSXExpressionContainer",
    );
    const code = codeFromEstree(expressionContainer, context);
    const block = codeBlock(
      code ?? "",
      estreeAttributeLiteral(openingElement, "className") ??
        estreeAttributeLiteral(openingElement, "language"),
    );
    return block ? [block] : [];
  }

  if (name === "img" || name === "video" || name === "Asciinema") {
    return [];
  }

  const blocks = children.flatMap((child) => blocksFromEstree(child, context));
  const compacted = compactBlocks(blocks);

  if (name === "Alert") {
    const content = plainTextFromBlocks(compacted);
    const block = textBlock(content ? `Note: ${content}` : "");
    return block ? [block] : [];
  }

  if (name === "Important" || name === "code") {
    const content = plainTextFromBlocks(compacted);
    const block = textBlock(content ? `\`${content}\`` : "");
    return block ? [block] : [];
  }

  if (name === "Link" || name === "a") {
    const label = plainTextFromBlocks(compacted);
    const href =
      estreeAttributeLiteral(openingElement, "href") ??
      staticTextFromEstree(
        estreeAttributeExpression(openingElement, "href"),
        context,
      );
    const target = safeLinkTarget(href);
    const block = textBlock(target && label ? `[${label}](${target})` : label);
    return block ? [block] : [];
  }

  if (compacted.length > 0) {
    return compacted;
  }

  for (const attributeName of ["title", "label", "description"] as const) {
    const literal = estreeAttributeLiteral(openingElement, attributeName);
    const block = textBlock(literal ?? "");
    if (block) return [block];
  }

  return [];
}

function blocksFromEstree(
  value: unknown,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  const node = asNode(value);
  if (!node) {
    return [];
  }

  switch (node.type) {
    case "Program":
      return childArray(node, "body").flatMap((child) =>
        blocksFromEstree(child, context),
      );
    case "ExpressionStatement":
      return blocksFromEstree(node.expression, context);
    case "JSXExpressionContainer":
      return blocksFromEstree(node.expression, context);
    case "JSXFragment":
      return compactBlocks(
        childArray(node, "children").flatMap((child) =>
          blocksFromEstree(child, context),
        ),
      );
    case "JSXElement":
      return estreeJsxBlocks(node, context);
    case "JSXText": {
      const block = textBlock(typeof node.value === "string" ? node.value : "");
      return block ? [block] : [];
    }
    case "Literal": {
      const value = node.value;
      const block = textBlock(
        typeof value === "string" || typeof value === "number" ? String(value) : "",
      );
      return block ? [block] : [];
    }
    case "TemplateLiteral": {
      const block = textBlock(rawTemplateLiteral(node, context) ?? "");
      return block ? [block] : [];
    }
    case "ArrayExpression":
      return compactBlocks(
        childArray(node, "elements").flatMap((element) =>
          blocksFromEstree(element, context),
        ),
      );
    case "ObjectExpression": {
      const blocks: NormalizedBlock[] = [];
      for (const property of childArray(node, "properties")) {
        const record = asNode(property);
        if (record?.type !== "Property" || record.computed === true) continue;
        const name =
          estreeIdentifierName(record.key) ??
          (asNode(record.key)?.type === "Literal" &&
          typeof asNode(record.key)?.value === "string"
            ? (asNode(record.key)?.value as string)
            : null);
        if (name && VISIBLE_OBJECT_PROPERTIES.has(name)) {
          blocks.push(...blocksFromEstree(record.value, context));
        }
      }
      return compactBlocks(blocks);
    }
    case "CallExpression": {
      const callee = asNode(node.callee);
      if (callee?.type === "MemberExpression") {
        const method = estreeIdentifierName(callee.property);
        const object = asNode(callee.object);
        if (method === "map" && object?.type === "ArrayExpression") {
          addDiagnostic(
            context,
            "dynamic_map_callback_ignored",
            "A static array was retained while its dynamic map callback was ignored.",
            null,
          );
          return blocksFromEstree(object, context);
        }
      }
      addDiagnostic(
        context,
        "unsupported_dynamic_expression",
        "A dynamic MDX expression was ignored without execution.",
        null,
      );
      return [];
    }
    case "EmptyExpression":
      return [];
    default:
      if (
        node.type.endsWith("Expression") ||
        node.type === "Identifier" ||
        node.type === "MemberExpression"
      ) {
        addDiagnostic(
          context,
          "unsupported_dynamic_expression",
          "A dynamic MDX expression was ignored without execution.",
          null,
        );
      }
      return [];
  }
}

function inlineText(node: AstNode, context: ExtractionContext): string {
  switch (node.type) {
    case "text":
      return node.value ?? "";
    case "inlineCode":
      return node.value ? `\`${node.value}\`` : "";
    case "break":
      return "\n";
    case "link": {
      const label = normalizeProse(
        (node.children ?? []).map((child) => inlineText(child, context)).join(""),
      );
      const target = node.url ? safeLinkTarget(node.url) : null;
      return target && label ? `[${label}](${target})` : label;
    }
    case "image": {
      const label = normalizeProse(node.alt ?? "");
      const target = node.url ? safeLinkTarget(node.url) : null;
      return target && label ? `[${label}](${target})` : label;
    }
    case "mdxTextExpression":
      return plainTextFromBlocks(
        blocksFromEstree(expressionFromProgram(node.data?.estree), context),
      );
    case "mdxJsxTextElement":
      return plainTextFromBlocks(astComponentBlocks(node, context));
    default:
      return (node.children ?? [])
        .map((child) => inlineText(child, context))
        .join("");
  }
}

function astComponentBlocks(
  node: AstNode,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  const name = node.name;
  if (name === "Head") return [];
  if (name === "TickIcon") {
    const block = textBlock(TABLE_AFFIRMATIVE_MARKER);
    return block ? [block] : [];
  }
  if (name === "Tabs") {
    return tabsBlocks(
      astAttributeExpression(node, "tabs"),
      astAttributeExpression(node, "content"),
      context,
    );
  }
  if (name === "HighlightTabs") {
    return highlightTabsBlocks(astAttributeExpression(node, "tabs"), context);
  }
  if (name === "Step") {
    const steps = astAttributeExpression(node, "steps");
    if (steps) return stepBlocks(steps, context);

    const blocks = compactBlocks(
      (node.children ?? []).flatMap((child) => astNodeBlocks(child, context)),
    );
    const titleBlock = textBlock(astLiteralAttribute(node, "title") ?? "");
    return compactBlocks(titleBlock ? [titleBlock, ...blocks] : blocks);
  }
  if (name === "Table") {
    const headers = astAttributeExpression(node, "headers");
    const data = astAttributeExpression(node, "data");
    if (headers || data) return tableBlocks(headers, data, context);
    return blocksFromEstree(astAttributeExpression(node, "content"), context);
  }
  if (name === "QuestionBox") {
    const questionBlock = textBlock(astLiteralAttribute(node, "question") ?? "");
    const answerBlocks = blocksFromEstree(
      astAttributeExpression(node, "answer"),
      context,
    );
    return compactBlocks(
      questionBlock ? [questionBlock, ...answerBlocks] : answerBlocks,
    );
  }
  if (name === "Highlight") {
    const expression = node.children?.find(
      (child) => child.type === "mdxFlowExpression" || child.type === "mdxTextExpression",
    );
    const code = codeFromEstree(
      expressionFromProgram(expression?.data?.estree),
      context,
    );
    const block = codeBlock(
      code ?? "",
      astLiteralAttribute(node, "className") ??
        astLiteralAttribute(node, "language"),
    );
    return block ? [block] : [];
  }
  if (name === "img" || name === "video" || name === "Asciinema") return [];

  const blocks = compactBlocks(
    (node.children ?? []).flatMap((child) => astNodeBlocks(child, context)),
  );

  if (name === "Alert") {
    const content = plainTextFromBlocks(blocks);
    const block = textBlock(content ? `Note: ${content}` : "");
    return block ? [block] : [];
  }
  if (name === "Important" || name === "code") {
    const content = plainTextFromBlocks(blocks);
    const block = textBlock(content ? `\`${content}\`` : "");
    return block ? [block] : [];
  }
  if (name === "Link" || name === "a") {
    const label = plainTextFromBlocks(blocks);
    const target = safeLinkTarget(astLiteralAttribute(node, "href") ?? "");
    const block = textBlock(target && label ? `[${label}](${target})` : label);
    return block ? [block] : [];
  }

  if (blocks.length > 0) return blocks;
  for (const attributeName of ["title", "label", "description"] as const) {
    const block = textBlock(astLiteralAttribute(node, attributeName) ?? "");
    if (block) return [block];
  }
  return [];
}

function astNodeBlocks(
  node: AstNode,
  context: ExtractionContext,
): readonly NormalizedBlock[] {
  switch (node.type) {
    case "paragraph": {
      const block = textBlock(inlineText(node, context));
      return block ? [block] : [];
    }
    case "code": {
      const block = codeBlock(node.value ?? "", node.lang ?? null);
      return block ? [block] : [];
    }
    case "blockquote": {
      const content = plainTextFromBlocks(
        (node.children ?? []).flatMap((child) => astNodeBlocks(child, context)),
      );
      const block = textBlock(content ? `> ${content}` : "");
      return block ? [block] : [];
    }
    case "list": {
      const blocks: NormalizedBlock[] = [];
      (node.children ?? []).forEach((item, index) => {
        const content = plainTextFromBlocks(astNodeBlocks(item, context));
        const prefix = node.ordered ? `${index + 1}.` : "-";
        const block = textBlock(content ? `${prefix} ${content}` : "");
        if (block) blocks.push(block);
      });
      return blocks;
    }
    case "listItem":
    case "root":
      return compactBlocks(
        (node.children ?? []).flatMap((child) => astNodeBlocks(child, context)),
      );
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      return astComponentBlocks(node, context);
    case "mdxFlowExpression":
    case "mdxTextExpression":
      return blocksFromEstree(expressionFromProgram(node.data?.estree), context);
    case "html":
    case "thematicBreak":
    case "mdxjsEsm":
      return [];
    default: {
      if (node.children) {
        return compactBlocks(
          node.children.flatMap((child) => astNodeBlocks(child, context)),
        );
      }
      const block = textBlock(node.value ?? "");
      return block ? [block] : [];
    }
  }
}

function layoutChildren(root: AstNode): readonly AstNode[] {
  const children = root.children ?? [];
  const layout = children.find(
    (node) => node.type === "mdxJsxFlowElement" && node.name === "Layout",
  );
  return layout?.children ?? children;
}

function findHeadMetadata(nodes: readonly AstNode[]): {
  readonly title: string | null;
  readonly description: string | null;
} {
  const head = nodes.find(
    (node) =>
      (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
      node.name === "Head",
  );
  if (!head) return { title: null, description: null };

  let title: string | null = null;
  let description: string | null = null;

  const visit = (node: AstNode): void => {
    if (node.name === "title" && !title) {
      title = normalizeProse(
        (node.children ?? []).map((child) => inlineText(child, {
          source: "",
          diagnostics: [],
        })).join(""),
      );
    }

    if (node.name === "meta" && !description) {
      const property = astLiteralAttribute(node, "property") ?? astLiteralAttribute(node, "name");
      if (property === "og:description" || property === "description") {
        description = normalizeProse(astLiteralAttribute(node, "content") ?? "");
      }
    }

    for (const child of node.children ?? []) visit(child);
  };

  visit(head);
  return { title: title || null, description: description || null };
}

export function extractStaticMdx(
  rawMdx: string,
  signal: AbortSignal | null = null,
): ExtractedMdxDocument {
  signal?.throwIfAborted();
  const diagnostics: NormalizationDiagnostic[] = [];
  const context: ExtractionContext = { source: rawMdx, diagnostics };
  const root = parser.parse(rawMdx) as AstNode;
  signal?.throwIfAborted();

  const nodes = layoutChildren(root);
  const head = findHeadMetadata(nodes);
  const items: ExtractedMdxItem[] = [];

  for (const node of nodes) {
    signal?.throwIfAborted();

    if (node.type === "mdxjsEsm" || node.name === "Head") continue;

    if (node.type === "heading") {
      const text = normalizeProse(inlineText(node, context));
      if (text) {
        items.push({
          kind: "heading",
          depth: node.depth ?? 1,
          text,
          position: positionFromNode(node),
        });
      }
      continue;
    }

    if (node.type === "mdxJsxFlowElement" && node.name === "Section") {
      const heading = normalizeProse(astLiteralAttribute(node, "title") ?? "");
      const anchor = normalizeProse(astLiteralAttribute(node, "id") ?? "");
      if (heading) {
        items.push({
          kind: "section",
          heading,
          anchor: anchor || null,
          position: positionFromNode(node),
        });
      } else {
        addDiagnostic(
          context,
          "invalid_section_marker",
          "A Section component without a static title was ignored.",
          positionFromNode(node),
        );
      }
      continue;
    }

    if (node.type === "mdxJsxFlowElement" && node.name === "QuestionBox") {
      const heading = normalizeProse(astLiteralAttribute(node, "question") ?? "");
      const anchor = normalizeProse(astLiteralAttribute(node, "id") ?? "");
      if (heading) {
        items.push({
          kind: "section",
          heading,
          anchor: anchor || null,
          position: positionFromNode(node),
        });
        const blocks = compactBlocks(astComponentBlocks(node, context));
        const answerBlocks =
          blocks[0]?.kind === "text" && blocks[0].text === heading
            ? blocks.slice(1)
            : blocks;
        if (answerBlocks.length > 0) {
          items.push({ kind: "blocks", blocks: answerBlocks });
        }
        continue;
      }
    }

    const blocks = compactBlocks(astNodeBlocks(node, context));
    if (blocks.length > 0) items.push({ kind: "blocks", blocks });
  }

  return {
    headTitle: head.title,
    headDescription: head.description,
    items,
    diagnostics,
  };
}
