/**
 * HTML escaping for values interpolated into email templates.
 *
 * Emails are built as raw HTML strings, so React's automatic escaping does not
 * apply. Any user-supplied value (names, titles) must be escaped before it is
 * embedded, otherwise the template becomes an injection point.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char])
}
