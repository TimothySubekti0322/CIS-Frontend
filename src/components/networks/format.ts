/**
 * Formatters for the parts of the payload whose shape the backend owns —
 * `raw_counts`, `score_contribution`, `signal_profile`, run `parameters`.
 *
 * These are rendered generically on purpose: fixing a schema for them in the
 * client would silently drop whatever a new signal family starts reporting.
 */

/** `posts_within_window` -> "Posts within window". */
export function humanise(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}
