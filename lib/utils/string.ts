/**
 * Utility functions for string manipulation and HTML escaping
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param value - The string to escape
 * @returns The escaped string
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replaces all occurrences of tokens in a template string
 * @param template - The template string containing tokens
 * @param replacements - Object mapping tokens to their replacement values
 * @returns The template with all tokens replaced
 */
export function replaceTemplateTokens(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(token, "g"), value);
  }
  return result;
}

