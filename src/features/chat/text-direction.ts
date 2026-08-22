const RTL_TEXT_PATTERN = /[\p{Script=Arabic}\p{Script=Hebrew}]/gu;
const LATIN_TEXT_PATTERN = /\p{Script=Latin}/gu;
const FIRST_DIRECTIONAL_CHARACTER_PATTERN = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Latin}]/u;

export type TextDirection = "rtl" | "ltr";

export function getTextDirection(content: string): TextDirection {
  const rtlCharacters = content.match(RTL_TEXT_PATTERN)?.length ?? 0;
  const latinCharacters = content.match(LATIN_TEXT_PATTERN)?.length ?? 0;

  if (rtlCharacters === 0) return "ltr";
  if (latinCharacters === 0 || rtlCharacters > latinCharacters) return "rtl";
  if (latinCharacters > rtlCharacters) return "ltr";

  return content.match(FIRST_DIRECTIONAL_CHARACTER_PATTERN)?.[0]?.match(RTL_TEXT_PATTERN)
    ? "rtl"
    : "ltr";
}
