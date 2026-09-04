import type {
  ConfigParameter,
  ConfigSection,
  ParameterCatalog,
} from "@/types/settings";

/**
 * Client-side logic for the dynamic-parameter form.
 *
 * # What this file may and may not know
 *
 * It must not restate a **bound**. Every min, max, unit, default and grouping
 * comes from the catalog, because two copies of a bound drift and the drift
 * shows up as a form that accepts a value the server rejects.
 *
 * It does name a handful of **keys**, for two reasons the catalog cannot
 * carry:
 *
 *  - the three cross-field rules are relationships between named parameters,
 *    and the point of checking them here is that the user sees the problem
 *    while editing rather than after saving. The server remains the authority;
 *    this is an echo of it, not a second implementation of the policy.
 *  - a few parameters have earned a bespoke affordance — a confirmation, a
 *    warning, a band preview. Those are presentation decisions about specific
 *    values, and there is nowhere else for them to live.
 *
 * A parameter added to the registry needs no change here: it renders from the
 * catalog like every other one, just without a bespoke extra.
 */

/** The keys carrying an affordance of their own. Not a copy of the registry. */
export const PARAM = {
  alertThreshold: "alert_threshold",
  csiRiskThreshold: "csi.risk_threshold",
  monitoredCity: "monitored_city",
  cityTimezone: "city_timezone",
  policyUploadWarnMb: "policy.upload_warn_size_mb",
  velocityZMin: "scoring.velocity_zscore_min",
  velocityZMax: "scoring.velocity_zscore_max",
  velocityEpsilon: "scoring.velocity_epsilon",
  discountGamma: "scoring.discount_gamma",
  csiBandRiskyCeiling: "csi.band_risky_ceiling",
  csiBandWatchCeiling: "csi.band_watch_ceiling",
  retentionDays: "alerts.score_snapshot_retention_days",
} as const;

/**
 * Above this, the discount cap lets pushback remove most of a claim's score.
 * A contested claim should be de-prioritised, never hidden, so the form says
 * so before the operator finds out from the rankings. The server allows it —
 * this only advises.
 */
export const GAMMA_WARN_ABOVE = 0.7;

/** Sum groups must total exactly this. Float noise makes an exact test wrong. */
export const SUM_TARGET = 1;
export const SUM_TOLERANCE = 1e-6;

/**
 * Changing one of these changes what every stored `final_claim_score` means,
 * so the form offers a rescore afterwards rather than leaving the repository
 * ranked by the old weighting.
 */
const RESCORE_IMPACTING_GROUPS = ["composite_weights", "harm_weights"];

/** A flat lookup of every parameter in the catalog. */
export function indexParameters(
  catalog: ParameterCatalog | undefined,
): Map<string, ConfigParameter> {
  const map = new Map<string, ConfigParameter>();
  for (const section of catalog?.sections ?? []) {
    for (const param of section.parameters) map.set(param.key, param);
  }
  return map;
}

/** Sections belonging to one tier, in the order the server sent them. */
export function sectionsForTier(
  catalog: ParameterCatalog | undefined,
  tier: string,
): ConfigSection[] {
  return (catalog?.sections ?? []).filter((section) => section.tier === tier);
}

/** `null` unless the string parses to a real, finite number. */
export function parseValue(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * The value a control should show: the pending edit if there is one, otherwise
 * the effective value the catalog reported.
 */
export function effectiveValue(
  param: ConfigParameter,
  draft: Record<string, string>,
): string {
  return draft[param.key] ?? param.value;
}

/** The running total of a sum group, over the draft as it currently stands. */
export function sumGroupTotal(
  group: string,
  parameters: ConfigParameter[],
  draft: Record<string, string>,
): number {
  return parameters
    .filter((param) => param.sumGroup === group)
    .reduce(
      (total, param) => total + (parseValue(effectiveValue(param, draft)) ?? 0),
      0,
    );
}

export function sumGroupSatisfied(total: number): boolean {
  return Math.abs(total - SUM_TARGET) <= SUM_TOLERANCE;
}

/** The distinct sum groups present in a section, in first-appearance order. */
export function sumGroupsIn(section: ConfigSection): string[] {
  const seen: string[] = [];
  for (const param of section.parameters) {
    if (param.sumGroup && !seen.includes(param.sumGroup))
      seen.push(param.sumGroup);
  }
  return seen;
}

/**
 * A per-field bound check mirroring the server's, so a local failure and a 422
 * read the same way in the same place.
 */
export function boundError(param: ConfigParameter, raw: string): string | null {
  const value = raw.trim();
  if (value === "") return "must not be empty";
  if (param.type === "string" || param.type === "boolean") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return param.type === "integer"
      ? "must be a whole number"
      : "must be a number";
  }
  if (param.type === "integer" && !Number.isInteger(n)) {
    return "must be a whole number";
  }
  if (param.min !== null && n < param.min)
    return `must be at least ${param.min}`;
  if (param.max !== null && n > param.max)
    return `must be at most ${param.max}`;
  return null;
}

/**
 * The three cross-field rules, echoed locally so a save is blocked before the
 * round trip. Keyed the way the server keys its 422 `details`: by group for a
 * sum failure (no single input is at fault), by parameter for an ordering one.
 */
export function crossFieldErrors(
  catalog: ParameterCatalog | undefined,
  draft: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const index = indexParameters(catalog);
  const params = [...index.values()];
  if (params.length === 0) return errors;

  const valueOf = (key: string): number | null => {
    const param = index.get(key);
    return param ? parseValue(effectiveValue(param, draft)) : null;
  };

  const groups = new Set(
    params
      .map((param) => param.sumGroup)
      .filter((g): g is string => Boolean(g)),
  );
  for (const group of groups) {
    const total = sumGroupTotal(group, params, draft);
    if (!sumGroupSatisfied(total)) {
      errors[group] = `must sum to 1.00, currently ${total.toFixed(4)}`;
    }
  }

  const zMin = valueOf(PARAM.velocityZMin);
  const zMax = valueOf(PARAM.velocityZMax);
  if (zMin !== null && zMax !== null && zMin >= zMax) {
    errors[PARAM.velocityZMax] =
      "the z-score ceiling must be greater than the floor";
  }

  const risky = valueOf(PARAM.csiBandRiskyCeiling);
  const watch = valueOf(PARAM.csiBandWatchCeiling);
  if (risky !== null && watch !== null && risky >= watch) {
    errors[PARAM.csiBandWatchCeiling] =
      "the watch ceiling must be greater than the risky ceiling";
  }

  return errors;
}

/** Only genuinely changed, non-empty values travel — an omitted key is unchanged. */
export function buildPatch(
  parameters: Map<string, ConfigParameter>,
  draft: Record<string, string>,
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const [key, raw] of Object.entries(draft)) {
    const param = parameters.get(key);
    if (!param || !param.writable) continue;
    const value = raw.trim();
    if (value === "" || value === param.value.trim()) continue;
    patch[key] = value;
  }
  return patch;
}

/**
 * Whether a saved patch changed what a stored score *means*, which is what
 * makes a rescore worth offering. A claim's rank moves the moment a weight
 * does, but its stored score does not until it is recomputed.
 */
export function needsRescore(
  parameters: Map<string, ConfigParameter>,
  patch: Record<string, string>,
): boolean {
  return Object.keys(patch).some((key) => {
    if (key === PARAM.discountGamma) return true;
    const group = parameters.get(key)?.sumGroup;
    return Boolean(group && RESCORE_IMPACTING_GROUPS.includes(group));
  });
}

/**
 * An advisory about a pending value that is legal but consequential. Distinct
 * from `boundError`: this never blocks a save.
 */
export function advisoryFor(
  param: ConfigParameter,
  raw: string,
): string | null {
  const n = parseValue(raw);
  if (n === null) return null;
  if (param.key === PARAM.discountGamma && n > GAMMA_WARN_ABOVE) {
    return `At ${n}, pushback can remove most of a claim's score.`;
  }
  return null;
}

/**
 * `error.details` from a 422, split the way its two shapes mean: an entry
 * naming a parameter belongs beside that field, and anything else names a
 * group and belongs above the fieldset, because no single input is at fault.
 */
export function splitValidationDetails(
  details: unknown,
  parameters: Map<string, ConfigParameter>,
): { fields: Record<string, string>; groups: Record<string, string> } {
  const fields: Record<string, string> = {};
  const groups: Record<string, string> = {};
  if (typeof details !== "object" || details === null)
    return { fields, groups };

  for (const [key, message] of Object.entries(
    details as Record<string, unknown>,
  )) {
    const text = typeof message === "string" ? message : String(message);
    if (parameters.has(key)) fields[key] = text;
    else groups[key] = text;
  }
  return { fields, groups };
}
