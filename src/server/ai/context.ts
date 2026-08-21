import type { RetrievalMatch } from "@/server/retrieval";

export const DEFAULT_MAX_CONTEXT_CHARACTERS = 12_000;

export interface GroundedEvidence {
  readonly citationIndex: number;
  readonly match: RetrievalMatch;
}

export interface AIContext {
  readonly evidence: readonly GroundedEvidence[];
  readonly formattedEvidence: string;
}

interface SerializedEvidence {
  readonly citation: number;
  readonly title: string;
  readonly section: string | null;
  readonly officialUrl: string;
  readonly content: string;
}

function serializeEvidence(
  match: RetrievalMatch,
  citationIndex: number,
): string {
  const item: SerializedEvidence = {
    citation: citationIndex,
    title: match.chunk.title,
    section: match.chunk.sectionHeading,
    officialUrl: match.chunk.source.publishedUrl,
    content: match.chunk.content,
  };

  return JSON.stringify(item);
}

export function buildAIContext(
  matches: readonly RetrievalMatch[],
  maxCharacters = DEFAULT_MAX_CONTEXT_CHARACTERS,
): AIContext {
  const evidence: GroundedEvidence[] = [];
  const serialized: string[] = [];
  let characterCount = 2;

  for (const match of matches) {
    const citationIndex = evidence.length + 1;
    const value = serializeEvidence(match, citationIndex);
    const separatorLength = serialized.length === 0 ? 0 : 1;

    if (characterCount + separatorLength + value.length > maxCharacters) {
      break;
    }

    evidence.push(Object.freeze({ citationIndex, match }));
    serialized.push(value);
    characterCount += separatorLength + value.length;
  }

  return Object.freeze({
    evidence: Object.freeze(evidence),
    formattedEvidence: `[${serialized.join(",")}]`,
  });
}
