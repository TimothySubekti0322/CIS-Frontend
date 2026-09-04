/**
 * The dynamic-parameter catalog (`GET /settings/parameters`).
 *
 * Every bound, unit, default and grouping on this screen is served by the
 * backend from the registry that also validates the writes. Nothing here
 * restates a bound: a second copy drifts, and the drift shows up as a form
 * that accepts a value the server then rejects.
 *
 * Values cross the wire as **strings** whatever their declared type — the
 * registry says how each is parsed, so the transport does not guess.
 */

/** The two tiers, split by *who decides*, which is what maps onto a screen. */
export const TIER_OPERATIONS = "operations";
export const TIER_ANALYTICS = "analytics";

export type ParameterType = "number" | "integer" | "string" | "boolean";

/** Which service *reads* the value. The write path is always this frontend. */
export type ParameterOwner = "backend" | "ai" | "shared";

/** One configurable value: its registry definition plus its current value. */
export interface ConfigParameter {
  key: string;
  label: string;
  tier: string;
  section: string;
  type: ParameterType;
  /** The documented default, for the "reset" affordance. */
  default: string;
  /** `null` means unbounded — which only happens on non-numeric types. */
  min: number | null;
  max: number | null;
  /** Suffix for the input: `days`, `hours`, `MB`, `score`, `σ`, `cosine`. */
  unit: string | null;
  owner: ParameterOwner;
  /** When set, this parameter's group must total exactly 1.00. */
  sumGroup: string | null;
  /** Computed from another parameter and never stored. Shown beside its source. */
  derived: boolean;
  /** The endpoint that owns writes for this key, when it is not this one. */
  managedBy: string | null;
  prdRef: string | null;
  paramId: string | null;
  description: string;
  /** A caveat the bounds alone cannot express. Shown as help text. */
  note: string | null;
  /** The effective value: the stored one, or `default` when nothing is stored. */
  value: string;
  /**
   * The value differs from `default`, so a reset would do something. This is a
   * comparison, not "a row exists" — the seed writes a row for every parameter.
   */
  isSet: boolean;
  /** `false` for a derived value and for one with a dedicated endpoint. */
  writable: boolean;
}

/** One fieldset of the form. Sections arrive in display order. */
export interface ConfigSection {
  key: string;
  tier: string;
  title: string;
  description: string;
  parameters: ConfigParameter[];
}

/** One of the two screens the parameters split across. */
export interface ConfigTier {
  key: string;
  title: string;
  description: string;
}

/** The whole dynamic-parameter surface in one payload. */
export interface ParameterCatalog {
  tiers: ConfigTier[];
  sections: ConfigSection[];
  generatedAt: string | null;
}

/** A partial write: only the keys present change. */
export type ParameterPatch = Record<string, string>;
