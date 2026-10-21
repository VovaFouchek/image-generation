/** Normalises untrusted notes for quoting inside a single prompt field. */
export function toInlineData(text: string, maxLength = 400): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/"/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}
