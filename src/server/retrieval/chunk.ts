import { createDocumentationChunkId } from "./identity";
import { analyzeLexicalText } from "./text";
import type {
  DocumentationChunk,
  NormalizedBlock,
  NormalizedDocument,
  NormalizedSection,
} from "./types";

export const DEFAULT_CHUNK_MAX_CHARACTERS = 1_800;
export const DEFAULT_CHUNK_OVERLAP_CHARACTERS = 240;

export interface ChunkDocumentationOptions {
  readonly maxCharacters?: number;
  readonly overlapCharacters?: number;
}

interface ChunkUnit {
  readonly block: NormalizedBlock;
  readonly rendered: string;
}

const CODE_LANGUAGE_PATTERN = /^[a-z0-9_+.-]{1,32}$/iu;

function normalizedCodeLanguage(language: string | null): string | null {
  const normalized = language?.trim() ?? "";
  return CODE_LANGUAGE_PATTERN.test(normalized) ? normalized : null;
}

function renderBlock(block: NormalizedBlock): string {
  if (block.kind === "text") return block.text.trim();

  const language = normalizedCodeLanguage(block.language) ?? "";
  return `\`\`\`${language}\n${block.text}\n\`\`\``;
}

function splitText(text: string, maxCharacters: number): readonly string[] {
  const parts: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxCharacters) {
    const candidate = remaining.slice(0, maxCharacters);
    const minimumBreak = Math.floor(maxCharacters * 0.55);
    const breakAt = Math.max(
      candidate.lastIndexOf("\n"),
      candidate.lastIndexOf(". "),
      candidate.lastIndexOf("؟ "),
      candidate.lastIndexOf("! "),
      candidate.lastIndexOf(" "),
    );
    const end = breakAt >= minimumBreak ? breakAt + 1 : maxCharacters;
    const part = remaining.slice(0, end).trim();
    if (part) parts.push(part);
    remaining = remaining.slice(end).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

function splitCode(text: string, maxCharacters: number): readonly string[] {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > maxCharacters) {
    const candidate = remaining.slice(0, maxCharacters);
    const newline = candidate.lastIndexOf("\n");
    const end = newline >= Math.floor(maxCharacters * 0.4)
      ? newline + 1
      : maxCharacters;
    parts.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }

  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

function expandBlocks(
  blocks: readonly NormalizedBlock[],
  maxCharacters: number,
): readonly ChunkUnit[] {
  return blocks.flatMap((block) => {
    if (block.kind === "code") {
      const language = normalizedCodeLanguage(block.language);
      const fenceOverhead = 8 + (language?.length ?? 0);
      const maxCodeCharacters = maxCharacters - fenceOverhead;

      return splitCode(block.text, maxCodeCharacters).map((text) => {
        const splitBlock: NormalizedBlock = {
          kind: "code",
          text,
          language,
        };
        return { block: splitBlock, rendered: renderBlock(splitBlock) };
      });
    }

    return splitText(block.text, maxCharacters).map((text) => {
      const splitBlock: NormalizedBlock = {
        kind: "text",
        text,
        language: null,
      };
      return { block: splitBlock, rendered: text };
    });
  });
}

function renderedLength(units: readonly ChunkUnit[]): number {
  if (units.length === 0) return 0;
  return units.reduce((length, unit) => length + unit.rendered.length, 0) +
    (units.length - 1) * 2;
}

function overlapTail(
  units: readonly ChunkUnit[],
  maxCharacters: number,
): readonly ChunkUnit[] {
  if (maxCharacters === 0) return [];

  const tail: ChunkUnit[] = [];
  let length = 0;

  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index];
    if (!unit || unit.block.kind !== "text") break;

    const separator = tail.length > 0 ? 2 : 0;
    if (length + separator + unit.rendered.length <= maxCharacters) {
      tail.unshift(unit);
      length += separator + unit.rendered.length;
      continue;
    }

    if (tail.length === 0) {
      const suffixStart = Math.max(0, unit.rendered.length - maxCharacters);
      const candidate = unit.rendered.slice(suffixStart);
      const firstSpace = candidate.indexOf(" ");
      const suffix = candidate
        .slice(firstSpace >= 0 && suffixStart > 0 ? firstSpace + 1 : 0)
        .trim();
      if (suffix) {
        const block: NormalizedBlock = {
          kind: "text",
          text: suffix,
          language: null,
        };
        tail.push({ block, rendered: suffix });
      }
    }
    break;
  }

  return tail;
}

function estimateTokens(content: string): number {
  const lexicalCount = analyzeLexicalText(content).tokens.length;
  return Math.max(
    1,
    Math.ceil(content.length / 4),
    Math.ceil(lexicalCount * 1.3),
  );
}

function chunkSection(
  document: NormalizedDocument,
  section: NormalizedSection,
  firstOrder: number,
  maxCharacters: number,
  overlapCharacters: number,
): readonly DocumentationChunk[] {
  const units = expandBlocks(section.blocks, maxCharacters);
  const groups: ChunkUnit[][] = [];
  let current: ChunkUnit[] = [];

  const flush = (): void => {
    if (current.length > 0) groups.push([...current]);
  };

  for (const unit of units) {
    const nextLength = renderedLength([...current, unit]);
    if (current.length > 0 && nextLength > maxCharacters) {
      const previous = current;
      flush();
      current = [...overlapTail(previous, overlapCharacters)];
      if (renderedLength([...current, unit]) > maxCharacters) current = [];
    }
    current.push(unit);
  }
  flush();

  return groups.map((group, index) => {
    const content = group.map((unit) => unit.rendered).join("\n\n");
    if (content.length > maxCharacters) {
      throw new Error(
        `Chunk construction exceeded the ${maxCharacters}-character hard limit for ${document.source.repositoryPath} (${content.length})`,
      );
    }
    const order = firstOrder + index;
    return {
      chunkId: createDocumentationChunkId(
        document.documentId,
        section.sectionId,
        order,
        content,
      ),
      documentId: document.documentId,
      sectionId: section.sectionId,
      source: document.source,
      title: document.title,
      sectionHeading: section.heading,
      headingPath: [...section.headingPath],
      anchor: section.anchor,
      content,
      order,
      estimatedTokens: estimateTokens(content),
    } satisfies DocumentationChunk;
  });
}

export function chunkDocumentationDocument(
  document: NormalizedDocument,
  options: ChunkDocumentationOptions = {},
): readonly DocumentationChunk[] {
  const maxCharacters = options.maxCharacters ?? DEFAULT_CHUNK_MAX_CHARACTERS;
  const overlapCharacters =
    options.overlapCharacters ?? DEFAULT_CHUNK_OVERLAP_CHARACTERS;

  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 200) {
    throw new RangeError("maxCharacters must be a safe integer of at least 200");
  }
  if (
    !Number.isSafeInteger(overlapCharacters) ||
    overlapCharacters < 0 ||
    overlapCharacters >= maxCharacters
  ) {
    throw new RangeError(
      "overlapCharacters must be a non-negative safe integer below maxCharacters",
    );
  }

  const chunks: DocumentationChunk[] = [];
  for (const section of document.sections) {
    const sectionChunks = chunkSection(
      document,
      section,
      chunks.length,
      maxCharacters,
      overlapCharacters,
    );
    chunks.push(...sectionChunks);
  }
  return chunks;
}
