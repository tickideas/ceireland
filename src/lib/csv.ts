/**
 * CSV value escaping per RFC 4180.
 *
 * - `null` / `undefined` become the empty string.
 * - Values containing `"`, `,`, or `\n` are wrapped in double quotes; embedded
 *   `"` is doubled.
 * - Everything else is stringified as-is.
 *
 * The whole seam is this one function on purpose. CSV row assembly varies
 * across callers (in-memory build vs streaming async generator), so we keep
 * the per-value primitive shared and let each caller stay in charge of how
 * rows reach the response.
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
