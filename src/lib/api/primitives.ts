/**
 * Defensive primitives shared by every DTO → domain mapper.
 *
 * The rules these encode are the mapping layer's contract, and they are
 * deliberately strict: a field the backend omits becomes `null`, never `0` or
 * `""` — a Synthetic claim's absent score must not render as a zero score —
 * and an unknown enum value falls back to the documented default rather than
 * throwing, so a status added on the backend never blanks a page.
 */

/** `null` unless the value is a real, finite number. */
export function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** A number with a floor — for counts the backend always sends. */
export function count(value: unknown, fallback = 0): number {
  return num(value) ?? fallback;
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** A required string, defaulting rather than propagating `null`. */
export function text(value: unknown, fallback = ""): string {
  return str(value) ?? fallback;
}

export function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** A list the backend may send as `null`. */
export function list<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Like `oneOf`, but for a genuinely optional enum: an absent or unrecognised
 * value becomes `null` instead of being coerced to a default that would
 * misreport it (a missing momentum direction is not "flat").
 */
export function optionalOneOf<T extends string>(
  value: unknown,
  allowed: T[],
): T | null {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : null;
}
