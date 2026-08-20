/**
 * Locale-independent lexical preparation for Persian and technical documentation.
 *
 * The implementation deliberately avoids Intl.Segmenter so index generation and
 * request-time queries produce the same tokens across deployment environments.
 */

const ARABIC_DIACRITICS =
  /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu;
const TATWEEL = /\u0640/gu;
const ZERO_WIDTH_SEPARATORS = /[\u200c\u200d\u2060\ufeff]/gu;
const ARABIC_YEH_VARIANTS = /[\u0649\u064a]/gu;
const ARABIC_KAF = /\u0643/gu;

// Dots and slashes remain inside terms such as next.js and @liara/cli.
const TOKEN_CANDIDATE =
  /@?[\p{L}\p{N}]+(?:[._/+:-][\p{L}\p{N}]+)*/gu;
const TECHNICAL_SEPARATOR = /[._/+:-]+/u;

export interface LexicalTextAnalysis {
  readonly normalizedText: string;
  readonly tokens: readonly string[];
  readonly uniqueTokens: readonly string[];
  readonly tokenFrequencies: Readonly<Record<string, number>>;
}

export type TokenSetInput = ReadonlySet<string> | readonly string[];

function canonicalizeCharacters(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(ZERO_WIDTH_SEPARATORS, " ")
    .replace(ARABIC_YEH_VARIANTS, "ی")
    .replace(ARABIC_KAF, "ک");
}

/**
 * Produces stable search text while retaining meaningful technical punctuation.
 */
export function normalizeLexicalText(input: string): string {
  const candidates = canonicalizeCharacters(input).match(TOKEN_CANDIDATE);

  return candidates?.join(" ") ?? "";
}

function componentTokens(candidate: string): readonly string[] {
  if (!candidate.startsWith("@") && !TECHNICAL_SEPARATOR.test(candidate)) {
    return [];
  }

  const components = candidate
    .replace(/^@/u, "")
    .split(TECHNICAL_SEPARATOR)
    .filter(Boolean);
  const compact = components.join("");

  return compact.length > 0 && compact !== candidate
    ? [...components, compact]
    : components;
}

/**
 * Emits a technical compound first, followed by its searchable components.
 */
export function tokenizeLexicalText(input: string): readonly string[] {
  const normalizedText = normalizeLexicalText(input);

  if (normalizedText.length === 0) {
    return Object.freeze([] as string[]);
  }

  const tokens: string[] = [];

  for (const candidate of normalizedText.split(" ")) {
    tokens.push(candidate, ...componentTokens(candidate));
  }

  return Object.freeze(tokens);
}

export function uniqueLexicalTokens(
  tokens: readonly string[],
): readonly string[] {
  return Object.freeze(Array.from(new Set(tokens)));
}

export function countTokenFrequencies(
  tokens: readonly string[],
): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Object.freeze(Object.fromEntries(counts));
}

export function analyzeLexicalText(input: string): LexicalTextAnalysis {
  const normalizedText = normalizeLexicalText(input);
  const tokens = tokenizeLexicalText(normalizedText);

  return Object.freeze({
    normalizedText,
    tokens,
    uniqueTokens: uniqueLexicalTokens(tokens),
    tokenFrequencies: countTokenFrequencies(tokens),
  });
}

/** Standard set Jaccard similarity; two empty token sets are identical. */
export function tokenSetJaccard(
  leftTokens: TokenSetInput,
  rightTokens: TokenSetInput,
): number {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);

  if (left.size === 0 && right.size === 0) {
    return 1;
  }

  let intersectionSize = 0;

  for (const token of left) {
    if (right.has(token)) {
      intersectionSize += 1;
    }
  }

  return intersectionSize / (left.size + right.size - intersectionSize);
}
