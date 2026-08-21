import type { Citation, LiaraSource } from "@/contracts";
import type { GroundedEvidence } from "@/server/ai";

const MAX_CITATION_SNIPPET_CHARACTERS = 600;

function citationUrl(publishedUrl: string, anchor: string | null): string {
  return anchor === null
    ? publishedUrl
    : `${publishedUrl}#${encodeURIComponent(anchor)}`;
}

function citationSnippet(content: string): string {
  if (content.length <= MAX_CITATION_SNIPPET_CHARACTERS) {
    return content;
  }

  return `${content.slice(0, MAX_CITATION_SNIPPET_CHARACTERS - 1).trimEnd()}…`;
}

export function createCitations(
  evidence: readonly GroundedEvidence[],
): readonly Citation[] {
  return Object.freeze(
    evidence.map(({ citationIndex, match }) => {
      const { chunk } = match;
      const source: LiaraSource = {
        id: chunk.chunkId,
        title: chunk.title,
        url: citationUrl(chunk.source.publishedUrl, chunk.anchor),
        documentationPath: chunk.source.repositoryPath,
        snippet: citationSnippet(chunk.content),
        serviceCategory: chunk.source.classification.category,
        ...(chunk.sectionHeading === null
          ? {}
          : { sectionHeading: chunk.sectionHeading }),
      };

      return Object.freeze({
        id: `citation_${chunk.chunkId}`,
        displayIndex: citationIndex,
        source: Object.freeze(source),
      });
    }),
  );
}
