/**
 * Prepares untrusted text (user notes, page content) for quoting inside a prompt:
 * one line, no angle brackets or double quotes, so it cannot close a quote or a <page_context>
 * block and pose as instructions.
 */
export function toInlineData(text: string, maxLength = 400): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/"/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}
