import { createDocumentationSectionId } from "./identity";
import { extractStaticMdx } from "./mdx-static";
import { createDocumentationSource } from "./source-policy";
import type {
  DocumentationSource,
  LoadedDocumentationFile,
  NormalizedBlock,
  NormalizedDocument,
  NormalizedSection,
  NormalizationDiagnostic,
  NormalizationSourcePosition,
  NormalizationResult,
} from "./types";

export const DOCUMENTATION_NORMALIZATION_ERROR_CODES = ["PARSE_FAILED"] as const;

export type DocumentationNormalizationErrorCode =
  (typeof DOCUMENTATION_NORMALIZATION_ERROR_CODES)[number];

export class DocumentationNormalizationError extends Error {
  readonly code: DocumentationNormalizationErrorCode;
  readonly repositoryPath: string;

  constructor(
    code: DocumentationNormalizationErrorCode,
    message: string,
    repositoryPath: string,
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = "DocumentationNormalizationError";
    this.code = code;
    this.repositoryPath = repositoryPath;
  }
}

export interface NormalizeDocumentationFileOptions {
  readonly signal?: AbortSignal;
}

interface MutableSection {
  heading: string | null;
  headingPath: string[];
  anchor: string | null;
  blocks: NormalizedBlock[];
  position: NormalizationSourcePosition | null;
}

function titleFromSource(source: DocumentationSource): string {
  const slug = source.pathSegments.at(-1) ?? "Liara documentation";
  return slug
    .split(/[-_]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function createEmptySection(): MutableSection {
  return {
    heading: null,
    headingPath: [],
    anchor: null,
    blocks: [],
    position: null,
  };
}

function hasRetrievableText(blocks: readonly NormalizedBlock[]): boolean {
  return blocks.some((block) => block.text.trim().length > 0);
}

function buildSections(
  documentId: DocumentationSource["documentId"],
  items: ReturnType<typeof extractStaticMdx>["items"],
  titleItemIndex: number,
  diagnostics: NormalizationDiagnostic[],
): readonly NormalizedSection[] {
  const sections: NormalizedSection[] = [];
  const headingStack: string[] = [];
  const usedAnchors = new Set<string>();
  let current = createEmptySection();

  const flush = (): void => {
    if (!hasRetrievableText(current.blocks)) return;
    const order = sections.length;
    const headingPath = [...current.headingPath];
    const blocks = [...current.blocks];
    let anchor = current.anchor;
    if (anchor !== null) {
      if (usedAnchors.has(anchor)) {
        diagnostics.push({
          code: "duplicate_section_anchor",
          message:
            "A duplicate source anchor was omitted to avoid an ambiguous citation.",
          position: current.position,
        });
        anchor = null;
      } else {
        usedAnchors.add(anchor);
      }
    }
    sections.push({
      sectionId: createDocumentationSectionId(
        documentId,
        headingPath,
        anchor,
        order,
      ),
      documentId,
      heading: current.heading,
      headingPath,
      anchor,
      order,
      blocks,
    });
  };

  items.forEach((item, index) => {
    if (item.kind === "blocks") {
      current.blocks.push(...item.blocks);
      return;
    }

    if (index === titleItemIndex) return;

    flush();
    if (item.kind === "section") {
      headingStack.splice(0, headingStack.length, item.heading);
      current = {
        heading: item.heading,
        headingPath: [item.heading],
        anchor: item.anchor,
        blocks: [],
        position: item.position,
      };
      return;
    }

    // The document H1 is not part of the section hierarchy. H1 and H2
    // therefore both begin a root section; deeper headings retain ancestry.
    const level = Math.max(1, item.depth - 1);
    headingStack.splice(level - 1);
    headingStack[level - 1] = item.text;
    current = {
      heading: item.text,
      headingPath: [...headingStack],
      anchor: null,
      blocks: [],
      position: item.position,
    };
  });

  flush();
  return sections;
}

export function normalizeDocumentationFile(
  file: LoadedDocumentationFile,
  options: NormalizeDocumentationFileOptions = {},
): NormalizationResult {
  options.signal?.throwIfAborted();
  const source = createDocumentationSource(file);

  if (file.rawMdx.trim().length === 0) {
    return {
      kind: "skipped",
      repositoryPath: file.repositoryPath,
      reason: "empty_source",
    };
  }

  let extracted: ReturnType<typeof extractStaticMdx>;
  try {
    extracted = extractStaticMdx(file.rawMdx, options.signal ?? null);
  } catch (error) {
    options.signal?.throwIfAborted();
    throw new DocumentationNormalizationError(
      "PARSE_FAILED",
      "Liara documentation MDX could not be parsed safely",
      file.repositoryPath,
      error,
    );
  }

  const titleItemIndex = extracted.items.findIndex(
    (item) => item.kind === "heading",
  );
  const titleItem = extracted.items[titleItemIndex];
  const title =
    (titleItem?.kind === "heading" ? titleItem.text : null) ??
    extracted.headTitle ??
    titleFromSource(source);
  const diagnostics = [...extracted.diagnostics];
  const sections = buildSections(
    source.documentId,
    extracted.items,
    titleItemIndex,
    diagnostics,
  );

  if (sections.length === 0) {
    return {
      kind: "skipped",
      repositoryPath: file.repositoryPath,
      reason: "no_retrievable_content",
    };
  }

  const document: NormalizedDocument = {
    documentId: source.documentId,
    source,
    title,
    description: extracted.headDescription,
    sections,
    diagnostics,
  };

  return { kind: "document", document };
}
