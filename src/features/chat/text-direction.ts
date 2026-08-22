const RTL_TEXT_PATTERN = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;

export function getTextDirection(content: string): "rtl" | "ltr" {
  return RTL_TEXT_PATTERN.test(content) ? "rtl" : "ltr";
}
