import { ApiError } from "@/types/common";
import { makeId, sleep } from "@/lib/utils";
import type {
  ConfigCatalogDto,
  ConfigParamViewDto,
  ConfigSectionViewDto,
} from "../dto.settings";
import type { SettingHistoryEntryDto } from "../dto.networks";
import { getSetting, getState, saveState, setSetting } from "./store";
import type { MockContext } from "./handlers";

/**
 * Mock-mode handlers for the F4 dynamic-parameter surface.
 *
 * Mock mode is the default, so without these the whole Admin Settings page is
 * a dead end when the app runs with no backend.
 *
 * The registry below is a transcription of `internal/models/config_params.go`,
 * and that is the point: in mock mode this file **is** the server, so it is
 * the one place a copy of the bounds legitimately lives. Every other part of
 * the frontend reads them from the catalog this builds. It also reproduces the
 * validation that actually matters to the form — per-field bounds, the four
 * sum groups, the policy-disruption ceiling and the two ordering rules —
 * because a mock that accepts everything would let the form ship untested
 * against the failure it exists to prevent.
 */

type Handler = (ctx: MockContext) => Promise<unknown>;

function ok<T>(data: T, message: string, meta?: unknown) {
  return meta
    ? { success: true, message, data, meta }
    : { success: true, message, data };
}

function fail(message: string, status: number, code: string, details?: unknown): never {
  throw new ApiError(message, status, code, details);
}

/* ------------------------------- registry -------------------------------- */

const TIER_OPS = "operations";
const TIER_ANALYTICS = "analytics";

interface MockParam {
  key: string;
  label: string;
  tier: string;
  section: string;
  type: "number" | "integer" | "string" | "boolean";
  default: string;
  min?: number;
  max?: number;
  unit?: string;
  owner: "backend" | "ai" | "shared";
  sum_group?: string;
  derived?: boolean;
  managed_by?: string;
  prd_ref?: string;
  param_id?: string;
  description: string;
  note?: string;
}

const SECTIONS: { key: string; tier: string; title: string; description: string }[] = [
  {
    key: "alerting",
    tier: TIER_OPS,
    title: "Alerting & risk threshold",
    description: "What counts as an elevated claim, everywhere in the product.",
  },
  {
    key: "overview_display",
    tier: TIER_OPS,
    title: "Overview page display",
    description: "How much the Overview page shows and how far back it compares.",
  },
  {
    key: "policy_bank",
    tier: TIER_OPS,
    title: "Public Policy Bank",
    description: "Upload guidance for policy documents.",
  },
  {
    key: "content_generation",
    tier: TIER_OPS,
    title: "AI content generation",
    description: "How much response copy the AI drafts per claim.",
  },
  {
    key: "scope",
    tier: TIER_OPS,
    title: "City & locale",
    description:
      "The single city this instance monitors, and the timezone its reports are stamped in.",
  },
  {
    key: "composite_weights",
    tier: TIER_ANALYTICS,
    title: "Claim score — composite weights",
    description:
      "How the five parameters combine into a claim's score. Must total 1.00.",
  },
  {
    key: "harm_weights",
    tier: TIER_ANALYTICS,
    title: "Harm severity — sub-weights",
    description: "How the four harm dimensions combine into H. Must total 1.00.",
  },
  {
    key: "reach_velocity",
    tier: TIER_ANALYTICS,
    title: "Reach & velocity normalisation",
    description: "How raw spread and growth are mapped onto the 0-100 scale.",
  },
  {
    key: "pushback",
    tier: TIER_ANALYTICS,
    title: "Public pushback discount",
    description: "How much organic correction reduces a claim's score.",
  },
  {
    key: "falseness",
    tier: TIER_ANALYTICS,
    title: "Falseness matching",
    description:
      "How confidently a claim has to match a verified debunk to be scored false.",
  },
  {
    key: "clustering",
    tier: TIER_ANALYTICS,
    title: "Clustering & policy matchmaking",
    description:
      "Similarity gates deciding what joins an existing claim, topic or policy.",
  },
  {
    key: "sentiment_index",
    tier: TIER_ANALYTICS,
    title: "Climate Sentiment Index",
    description: "The composition, window and health bands of the CSI gauge.",
  },
  {
    key: "overview_ranking",
    tier: TIER_ANALYTICS,
    title: "Overview ranking formula",
    description: "How topics and policies are sized and ranked against each other.",
  },
  {
    key: "retention",
    tier: TIER_ANALYTICS,
    title: "History retention",
    description: "How long score history is kept before it is pruned.",
  },
];

/** PRD 6.2.4's bias guardrail. A rule, not a starting value — hence its own name. */
const HARM_POLICY_DISRUPTION_CEILING = 0.25;

const REGISTRY: MockParam[] = [
  /* --- Tier 1 — operations --- */
  {
    key: "alert_threshold",
    label: "Alert threshold",
    tier: TIER_OPS,
    section: "alerting",
    type: "number",
    default: "70",
    min: 0,
    max: 100,
    unit: "score",
    owner: "shared",
    prd_ref: "§8; US32, US29, US71",
    param_id: "AP-16",
    description:
      "The FinalClaimScore at or above which a claim reads as Over Threshold on the Alert page, counts as above-threshold on the Overview, and can raise a threshold-crossing notification.",
    note: "The most operationally active value in the system. The CSI risk threshold inherits from it.",
  },
  {
    key: "csi.risk_threshold",
    label: "CSI risk threshold (derived)",
    tier: TIER_OPS,
    section: "alerting",
    type: "number",
    default: "70",
    min: 0,
    max: 100,
    unit: "score",
    owner: "backend",
    derived: true,
    prd_ref: "§6.6.2; US67",
    param_id: "AP-20",
    description:
      "Minimum FinalClaimScore for a claim to count toward the Climate Sentiment Index's RiskLoad.",
    note: 'Not independently editable: it always equals the alert threshold, so "elevated risk" means the same thing on the Alert page and on the Overview gauge.',
  },
  {
    key: "overview.top_policy_limit",
    label: "Top policies shown",
    tier: TIER_OPS,
    section: "overview_display",
    type: "integer",
    default: "5",
    min: 1,
    max: 20,
    unit: "policies",
    owner: "backend",
    prd_ref: "§11; US70",
    description: "How many policies the Overview's O3 leaderboard lists.",
    note: 'The spec\'s section heading says "Top 10" and its detail says top 5. This setting is how that open question is answered without a redeploy.',
  },
  {
    key: "overview.mom_window_days",
    label: "Month-on-month comparison window",
    tier: TIER_OPS,
    section: "overview_display",
    type: "integer",
    default: "30",
    min: 7,
    max: 90,
    unit: "days",
    owner: "backend",
    prd_ref: "§11; US69",
    description:
      "The window the O2 topic modal compares against the preceding one for its change figure.",
  },
  {
    key: "policy.upload_warn_size_mb",
    label: "Large upload warning",
    tier: TIER_OPS,
    section: "policy_bank",
    type: "integer",
    default: "50",
    min: 1,
    max: 2048,
    unit: "MB",
    owner: "backend",
    prd_ref: "§7; US40",
    param_id: "AP-17",
    description: "File size above which the Add Public Policy modal warns the uploader.",
    note: "A soft warning, never a block. US40 requires policy uploads to have no size limit; this flags an unusually large file rather than rejecting it.",
  },
  {
    key: "ai.debunk_segment_max_count",
    label: "Debunk segments per claim",
    tier: TIER_OPS,
    section: "content_generation",
    type: "integer",
    default: "3",
    min: 1,
    max: 5,
    unit: "variants",
    owner: "ai",
    prd_ref: "US12; US33",
    param_id: "AP-21",
    description:
      "How many audience-segmented debunk drafts the AI generates for each claim.",
    note: "Without a cap, a highly cross-cutting claim generates more drafts than anyone will review.",
  },
  {
    key: "monitored_city",
    label: "Monitored city",
    tier: TIER_OPS,
    section: "scope",
    type: "string",
    default: "Jakarta",
    owner: "shared",
    managed_by: "PUT /api/v1/settings/city",
    prd_ref: "US65; §6.6.4",
    param_id: "AP-22",
    description:
      "The single Indonesian city this instance monitors. Scopes every metric on the Overview page.",
    note: "Written through its own endpoint because the value must be one of a fixed catalog (GET /api/v1/settings/cities), and selecting a city also moves the report timezone with it.",
  },
  {
    key: "city_timezone",
    label: "City timezone",
    tier: TIER_OPS,
    section: "scope",
    type: "string",
    default: "Asia/Jakarta",
    owner: "backend",
    managed_by: "PUT /api/v1/settings/city-timezone",
    prd_ref: "§10.8",
    description:
      "IANA zone for the city-local half of every F5 report footer timestamp.",
    note: "Follows the monitored city automatically; set it directly only to override.",
  },

  /* --- Tier 2 — composite weights --- */
  {
    key: "scoring.weight_reach",
    label: "Weight — Reach (R)",
    tier: TIER_ANALYTICS,
    section: "composite_weights",
    type: "number",
    default: "0.15",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "composite_weights",
    prd_ref: "§6.3; US22",
    param_id: "AP-01",
    description:
      "Share of the composite score contributed by how far the claim has travelled.",
  },
  {
    key: "scoring.weight_velocity",
    label: "Weight — Velocity (V)",
    tier: TIER_ANALYTICS,
    section: "composite_weights",
    type: "number",
    default: "0.15",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "composite_weights",
    prd_ref: "§6.3; US22",
    param_id: "AP-02",
    description: "Share contributed by how fast the claim is currently growing.",
  },
  {
    key: "scoring.weight_falseness",
    label: "Weight — Falseness (F)",
    tier: TIER_ANALYTICS,
    section: "composite_weights",
    type: "number",
    default: "0.30",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "composite_weights",
    prd_ref: "§6.3; US22",
    param_id: "AP-03",
    description: "Share contributed by how confidently the claim is confirmed false.",
  },
  {
    key: "scoring.weight_harm",
    label: "Weight — Harm (H)",
    tier: TIER_ANALYTICS,
    section: "composite_weights",
    type: "number",
    default: "0.30",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "composite_weights",
    prd_ref: "§6.3; US22",
    param_id: "AP-04",
    description:
      "Share contributed by the estimated real-world damage the claim could cause.",
  },
  {
    key: "scoring.weight_emotional_intensity",
    label: "Weight — Emotional Intensity (EI)",
    tier: TIER_ANALYTICS,
    section: "composite_weights",
    type: "number",
    default: "0.10",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "composite_weights",
    prd_ref: "§6.3; US22",
    param_id: "AP-05",
    description: "Share contributed by how angry the public reaction to the claim is.",
  },

  /* --- Tier 2 — harm sub-weights --- */
  {
    key: "scoring.harm_weight_public_safety",
    label: "Harm — Public Safety",
    tier: TIER_ANALYTICS,
    section: "harm_weights",
    type: "number",
    default: "0.35",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "harm_weights",
    prd_ref: "§6.2.4; US23",
    param_id: "AP-06",
    description: "Share of Harm Severity carried by risk to physical safety.",
  },
  {
    key: "scoring.harm_weight_institutional_trust",
    label: "Harm — Institutional Trust",
    tier: TIER_ANALYTICS,
    section: "harm_weights",
    type: "number",
    default: "0.30",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "harm_weights",
    prd_ref: "§6.2.4; US23",
    param_id: "AP-07",
    description: "Share carried by erosion of trust in public institutions.",
  },
  {
    key: "scoring.harm_weight_economic",
    label: "Harm — Economic",
    tier: TIER_ANALYTICS,
    section: "harm_weights",
    type: "number",
    default: "0.20",
    min: 0,
    max: 1,
    owner: "shared",
    sum_group: "harm_weights",
    prd_ref: "§6.2.4; US23",
    param_id: "AP-08",
    description: "Share carried by economic damage.",
  },
  {
    key: "scoring.harm_weight_policy_disruption",
    label: "Harm — Policy Disruption",
    tier: TIER_ANALYTICS,
    section: "harm_weights",
    type: "number",
    default: "0.15",
    min: 0,
    max: HARM_POLICY_DISRUPTION_CEILING,
    owner: "shared",
    sum_group: "harm_weights",
    prd_ref: "§6.2.4; US23",
    param_id: "AP-09",
    description: "Share carried by concrete interference with policy execution.",
    note: "Hard ceiling of 0.25, enforced on save rather than merely recommended. This is the bias guardrail that stops the system being tuned until criticism of a government's own policy scores as harm.",
  },

  /* --- Tier 2 — reach & velocity --- */
  {
    key: "scoring.reach_normalization_window_days",
    label: "Reach normalisation window",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "integer",
    default: "90",
    min: 7,
    max: 365,
    unit: "days",
    owner: "ai",
    prd_ref: "§6.2.1",
    param_id: "AP-10",
    description:
      "How far back R_min/R_max are observed before raw reach is normalised onto 0-100.",
    note: "Shorter reacts faster to a shifting baseline; longer smooths seasonal noise.",
  },
  {
    key: "scoring.reach_weight_impressions",
    label: "Reach component — impressions (w1)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "0.25",
    min: 0,
    max: 1,
    owner: "ai",
    prd_ref: "§6.2.1",
    description: "Weight of log(1+Impressions) inside raw reach.",
  },
  {
    key: "scoring.reach_weight_unique_authors",
    label: "Reach component — unique authors (w2)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "0.25",
    min: 0,
    max: 1,
    owner: "ai",
    prd_ref: "§6.2.1",
    description: "Weight of log(1+UniqueAuthors) inside raw reach.",
  },
  {
    key: "scoring.reach_weight_content_count",
    label: "Reach component — content count (w3)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "0.25",
    min: 0,
    max: 1,
    owner: "ai",
    prd_ref: "§6.2.1",
    description: "Weight of log(1+ContentCount) inside raw reach.",
  },
  {
    key: "scoring.reach_weight_platform_spread",
    label: "Reach component — platform spread (w4)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "0.25",
    min: 0,
    max: 1,
    owner: "ai",
    prd_ref: "§6.2.1",
    description:
      "Weight of the DistinctPlatforms/TotalMonitoredPlatforms ratio inside raw reach.",
  },
  {
    key: "scoring.velocity_interval_hours",
    label: "Velocity interval (Δ)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "integer",
    default: "6",
    min: 1,
    max: 72,
    unit: "hours",
    owner: "ai",
    prd_ref: "§6.2.2",
    param_id: "AP-11",
    description:
      "The gap between the two volume readings whose difference is the growth rate.",
  },
  {
    key: "scoring.velocity_zscore_min",
    label: "Velocity z-score floor (Z_min)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "-3",
    min: -10,
    max: 0,
    unit: "σ",
    owner: "ai",
    prd_ref: "§6.2.2",
    param_id: "AP-12",
    description: "Standard deviations below baseline that map to a Velocity of 0.",
  },
  {
    key: "scoring.velocity_zscore_max",
    label: "Velocity z-score ceiling (Z_max)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "3",
    min: 0,
    max: 10,
    unit: "σ",
    owner: "ai",
    prd_ref: "§6.2.2",
    param_id: "AP-12",
    description: "Standard deviations above baseline that map to a Velocity of 100.",
    note: "Must be greater than the floor.",
  },
  {
    key: "scoring.velocity_epsilon",
    label: "Velocity epsilon (ε)",
    tier: TIER_ANALYTICS,
    section: "reach_velocity",
    type: "number",
    default: "0.0001",
    min: 0.000001,
    max: 1,
    owner: "ai",
    prd_ref: "§6.2.2",
    param_id: "AP-13",
    description: "Division-by-zero guard for a brand-new claim with no prior volume.",
  },

  /* --- Tier 2 — pushback --- */
  {
    key: "scoring.npr_window_hours",
    label: "Pushback rolling window",
    tier: TIER_ANALYTICS,
    section: "pushback",
    type: "integer",
    default: "36",
    min: 1,
    max: 168,
    unit: "hours",
    owner: "ai",
    prd_ref: "§6.4.3",
    param_id: "AP-14",
    description:
      "The window over which supporting and opposing volume are compared to compute NPR.",
    note: "Recommended 24-48 hours.",
  },
  {
    key: "scoring.discount_gamma",
    label: "Discount dampening cap (γ)",
    tier: TIER_ANALYTICS,
    section: "pushback",
    type: "number",
    default: "0.5",
    min: 0,
    max: 1,
    owner: "shared",
    prd_ref: "§6.4.4",
    param_id: "AP-15",
    description:
      "The largest share of a claim's score that organic pushback can remove.",
    note: "At the default 0.5, even total pushback halves a score rather than erasing it — the design intent is that a contested claim is de-prioritised, never hidden.",
  },
  {
    key: "scoring.npr_reliability_minimum_posts",
    label: "Pushback reliability floor",
    tier: TIER_ANALYTICS,
    section: "pushback",
    type: "integer",
    default: "25",
    min: 0,
    max: 1000,
    unit: "posts",
    owner: "ai",
    prd_ref: "§6.4.7",
    description:
      "Total volume below which no discount is applied, because the pushback signal is too thin to trust.",
  },

  /* --- Tier 2 — falseness --- */
  {
    key: "scoring.falseness_match_threshold",
    label: "Debunk match threshold",
    tier: TIER_ANALYTICS,
    section: "falseness",
    type: "number",
    default: "0.55",
    min: 0,
    max: 1,
    unit: "cosine",
    owner: "ai",
    prd_ref: "§6.2.3",
    description:
      "Minimum similarity to a verified official source before a claim is scored as false.",
    note: 'Below it F is left unset rather than scored 0 — 0 would wrongly assert "confirmed true".',
  },
  {
    key: "scoring.falseness_live_match_score",
    label: "Live fact-check match score",
    tier: TIER_ANALYTICS,
    section: "falseness",
    type: "number",
    default: "75",
    min: 0,
    max: 100,
    unit: "score",
    owner: "ai",
    prd_ref: "§6.2.3",
    description:
      "Falseness score assigned when the live Fact Check API returns a false verdict.",
    note: "A fixed score rather than a modelled similarity, because a published verdict is a real judgement rather than a distance between two embeddings.",
  },

  /* --- Tier 2 — clustering --- */
  {
    key: "clustering.claim_attach_threshold",
    label: "Claim attach threshold",
    tier: TIER_ANALYTICS,
    section: "clustering",
    type: "number",
    default: "0.55",
    min: 0,
    max: 1,
    unit: "cosine",
    owner: "ai",
    prd_ref: "§6.2.1",
    description:
      "Similarity at which a new post joins an existing claim rather than seeding a new one.",
  },
  {
    key: "clustering.topic_attach_threshold",
    label: "Topic attach threshold",
    tier: TIER_ANALYTICS,
    section: "clustering",
    type: "number",
    default: "0.5",
    min: 0,
    max: 1,
    unit: "cosine",
    owner: "ai",
    prd_ref: "US42",
    description:
      "Similarity at which a new claim joins an existing topic rather than creating one.",
  },
  {
    key: "matchmaking.claim_prefilter_threshold",
    label: "Policy matchmaking prefilter",
    tier: TIER_ANALYTICS,
    section: "clustering",
    type: "number",
    default: "0.35",
    min: 0,
    max: 1,
    unit: "cosine",
    owner: "ai",
    prd_ref: "US42",
    description:
      "Similarity a claim must reach to be sent to the LLM as a candidate match for a policy.",
    note: "A recall knob: lower widens the candidate set and costs more LLM calls per upload.",
  },

  /* --- Tier 2 — Climate Sentiment Index --- */
  {
    key: "csi.weight_bcs",
    label: "CSI weight — baseline sentiment",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "number",
    default: "0.5",
    min: 0,
    max: 1,
    owner: "backend",
    sum_group: "csi_weights",
    prd_ref: "§6.6; US67, US68",
    param_id: "AP-18",
    description:
      "Share of the index carried by the overall tone of the climate conversation.",
  },
  {
    key: "csi.weight_risk_load",
    label: "CSI weight — risk load (inverted)",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "number",
    default: "0.5",
    min: 0,
    max: 1,
    owner: "backend",
    sum_group: "csi_weights",
    prd_ref: "§6.6; US67, US68",
    param_id: "AP-19",
    description: "Share carried by the burden of serious claims on the conversation.",
    note: "Weighted equally with baseline sentiment by default so a calm-sounding but dangerous conversation cannot score as healthy on tone alone.",
  },
  {
    key: "csi.window_days",
    label: "CSI rolling window",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "integer",
    default: "7",
    min: 1,
    max: 90,
    unit: "days",
    owner: "backend",
    prd_ref: "§6.6.3",
    description: "The rolling average behind the headline gauge figure.",
    note: "Fixed at 7 days to stop a single viral event swinging the index.",
  },
  {
    key: "csi.momentum_lag_hours",
    label: "CSI momentum lag",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "integer",
    default: "24",
    min: 1,
    max: 168,
    unit: "hours",
    owner: "backend",
    prd_ref: "§6.6.3",
    description:
      "How far behind the headline window the comparison window sits, giving the direction arrow.",
    note: "Recommended 24-48 hours.",
  },
  {
    key: "csi.minimum_volume",
    label: "CSI minimum activity",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "integer",
    default: "100",
    min: 1,
    max: 1000000,
    unit: "items",
    owner: "backend",
    prd_ref: "§6.6.3",
    description:
      'Conversation volume below which the gauge reads "Insufficient Data" instead of a score.',
    note: "Without a floor, a quiet week reports a falsely calm environment.",
  },
  {
    key: "csi.band_risky_ceiling",
    label: "CSI band — risky ceiling",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "number",
    default: "33.33",
    min: 0,
    max: 100,
    unit: "score",
    owner: "backend",
    prd_ref: "§6.6.5; US68",
    description: "Index value below which the gauge shows red.",
  },
  {
    key: "csi.band_watch_ceiling",
    label: "CSI band — watch ceiling",
    tier: TIER_ANALYTICS,
    section: "sentiment_index",
    type: "number",
    default: "66.67",
    min: 0,
    max: 100,
    unit: "score",
    owner: "backend",
    prd_ref: "§6.6.5; US68",
    description:
      "Index value below which the gauge shows amber, and at or above which it shows green.",
    note: "Must be greater than the risky ceiling. The spec names the three colours but gives no cut points; the defaults split the scale into equal thirds.",
  },

  /* --- Tier 2 — overview ranking --- */
  {
    key: "overview.treemap_weight_above_count",
    label: "Ranking weight — claims above threshold",
    tier: TIER_ANALYTICS,
    section: "overview_ranking",
    type: "number",
    default: "0.5",
    min: 0,
    max: 1,
    owner: "backend",
    sum_group: "treemap_weights",
    prd_ref: "§11; US69, US70",
    description:
      "Share of a topic's treemap box size, and a policy's leaderboard rank, driven by how many of its claims are above threshold.",
  },
  {
    key: "overview.treemap_weight_avg_score",
    label: "Ranking weight — average claim score",
    tier: TIER_ANALYTICS,
    section: "overview_ranking",
    type: "number",
    default: "0.5",
    min: 0,
    max: 1,
    owner: "backend",
    sum_group: "treemap_weights",
    prd_ref: "§11; US69, US70",
    description: "Share driven by the average score of its claims.",
    note: "US69 leaves this formula open and proposes an equal split; these two settings are that open question made adjustable.",
  },

  /* --- Tier 2 — retention --- */
  {
    key: "alerts.score_snapshot_retention_days",
    label: "Score history retention",
    tier: TIER_ANALYTICS,
    section: "retention",
    type: "integer",
    default: "400",
    min: 30,
    max: 3650,
    unit: "days",
    owner: "backend",
    prd_ref: "US27",
    description:
      "How long per-claim score snapshots are kept before the hourly job prunes them.",
    note: "The Alert page chart can only plot as far back as this. The default clears a full year plus a margin, so a Year granularity view is never short of data.",
  },
];

const BY_KEY = new Map(REGISTRY.map((param) => [param.key, param]));

const SUM_GROUP_LABELS: Record<string, string> = {
  composite_weights: "the five composite score weights",
  harm_weights: "the four harm sub-weights",
  csi_weights: "the two Climate Sentiment Index weights",
  treemap_weights: "the two Overview ranking weights",
};

/** Absorbs float representation error — 0.15+0.15+0.30+0.30+0.10 is not exactly 1. */
const SUM_TOLERANCE = 1e-9;

function writable(param: MockParam): boolean {
  return !param.derived && !param.managed_by;
}

/* ------------------------------ the catalog ------------------------------ */

/**
 * A parameter with no stored row reads as its documented default — deleting
 * the row rather than writing the default back is what lets a parameter follow
 * a revised specification.
 */
function storedValue(key: string): string | undefined {
  return getSetting(getState(), key)?.value;
}

function effectiveValue(param: MockParam): string {
  // The derived value is never stored: it mirrors its source, always.
  if (param.key === "csi.risk_threshold") {
    return storedValue("alert_threshold") ?? param.default;
  }
  return storedValue(param.key) ?? param.default;
}

function paramView(param: MockParam): ConfigParamViewDto {
  const value = effectiveValue(param);
  return {
    key: param.key,
    label: param.label,
    tier: param.tier,
    section: param.section,
    type: param.type,
    default: param.default,
    min: param.min,
    max: param.max,
    unit: param.unit,
    owner: param.owner,
    sum_group: param.sum_group,
    derived: param.derived,
    managed_by: param.managed_by,
    prd_ref: param.prd_ref,
    param_id: param.param_id,
    description: param.description,
    note: param.note,
    value,
    // Not "a row exists" — the seed writes a row for every parameter, so row
    // existence would be true everywhere and mean nothing.
    is_set: value.trim() !== param.default.trim(),
    writable: writable(param),
  };
}

function buildCatalog(): ConfigCatalogDto {
  const sections: ConfigSectionViewDto[] = [];
  for (const section of SECTIONS) {
    const parameters = REGISTRY.filter((p) => p.section === section.key).map(paramView);
    if (parameters.length > 0) sections.push({ ...section, parameters });
  }
  return {
    tiers: [
      {
        key: TIER_OPS,
        title: "Operational settings",
        description:
          "Day-to-day controls a city administrator can change safely. Each one changes what the product shows or how much it produces, never how a score is computed.",
      },
      {
        key: TIER_ANALYTICS,
        title: "Model & analytics settings",
        description:
          "Values that change what a score means. Editable by an admin, but the decision belongs with the engineering and data team — every one of them moves every claim's rank.",
      },
    ],
    sections,
    generated_at: new Date().toISOString(),
  };
}

/* ------------------------------- validation ------------------------------ */

/** One value against its declared type and bounds. */
function validateValue(param: MockParam, raw: string): string | null {
  const value = raw.trim();
  if (value === "") return "must not be empty";

  if (param.type === "boolean") {
    return value === "true" || value === "false" ? null : "must be true or false";
  }
  if (param.type === "string") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return param.type === "integer" ? "must be a whole number" : "must be a number";
  }
  if (param.type === "integer" && !Number.isInteger(parsed)) {
    return "must be a whole number";
  }
  if (param.min !== undefined && parsed < param.min) {
    return `must be at least ${param.min}`;
  }
  if (param.max !== undefined && parsed > param.max) {
    return `must be at most ${param.max}`;
  }
  return null;
}

/**
 * The cross-field rules, over a fully-resolved view: stored values with the
 * pending changes merged in. Taking the whole set rather than the changed keys
 * is the point — saving one composite weight is only legal in terms of the
 * other four.
 */
function validateSet(values: Map<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  const numeric = (key: string): number | null => {
    const raw = values.get(key);
    if (raw === undefined) return null;
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  };

  for (const [group, label] of Object.entries(SUM_GROUP_LABELS)) {
    let sum = 0;
    let complete = true;
    for (const param of REGISTRY) {
      if (param.sum_group !== group) continue;
      const value = numeric(param.key);
      if (value === null) {
        complete = false;
        break;
      }
      sum += value;
    }
    if (complete && Math.abs(sum - 1) > SUM_TOLERANCE) {
      errors[group] = `${label} must sum to 1.00, got ${sum.toFixed(4)}`;
    }
  }

  const zMin = numeric("scoring.velocity_zscore_min");
  const zMax = numeric("scoring.velocity_zscore_max");
  if (zMin !== null && zMax !== null && zMin >= zMax) {
    errors["scoring.velocity_zscore_max"] =
      "the z-score ceiling must be greater than the floor";
  }

  const risky = numeric("csi.band_risky_ceiling");
  const watch = numeric("csi.band_watch_ceiling");
  if (risky !== null && watch !== null && risky >= watch) {
    errors["csi.band_watch_ceiling"] =
      "the watch ceiling must be greater than the risky ceiling";
  }

  return errors;
}

/* -------------------------------- history -------------------------------- */

/**
 * US62's change log. Module-local rather than in the persisted mock state:
 * it is a demonstration of the audit trail, not something a reload has to
 * carry, and the real one lives in `cis_setting_history` either way.
 */
const history: SettingHistoryEntryDto[] = [];

function record(key: string, fromValue: string | null, toValue: string) {
  history.unshift({
    id: makeId("hist"),
    key,
    from_value: fromValue,
    to_value: toValue,
    changed_by: null,
    created_at: new Date().toISOString(),
  });
}

/* -------------------------------- handlers ------------------------------- */

const getParameters: Handler = async () => {
  await sleep(180);
  return ok(buildCatalog(), "configurable parameters");
};

/**
 * Partial update. Nothing is written when any key fails: the whole set is
 * validated first, then committed at once — otherwise a rejected request could
 * still leave half its changes in place.
 */
const putParameters: Handler = async (ctx) => {
  await sleep(240);
  const payload = (ctx.body ?? {}) as { parameters?: Record<string, string> };
  const incoming = payload.parameters ?? {};

  if (Object.keys(incoming).length === 0) {
    fail("parameters is required", 400, "VALIDATION_FAILED");
  }

  const details: Record<string, string> = {};
  for (const [key, raw] of Object.entries(incoming)) {
    const param = BY_KEY.get(key);
    if (!param) {
      details[key] = "is not a configurable parameter";
      continue;
    }
    if (param.derived) {
      details[key] = "is derived and cannot be set directly";
      continue;
    }
    if (param.managed_by) {
      details[key] = `is written through ${param.managed_by}`;
      continue;
    }
    const message = validateValue(param, String(raw));
    if (message) details[key] = message;
  }
  if (Object.keys(details).length > 0) {
    fail("some parameters failed validation", 422, "UNPROCESSABLE_ENTITY", details);
  }

  // Merge the pending changes over every stored value before the cross-field
  // rules run, so a change is checked against the siblings it was not sent with.
  const merged = new Map<string, string>();
  for (const param of REGISTRY) merged.set(param.key, effectiveValue(param));
  for (const [key, raw] of Object.entries(incoming)) merged.set(key, String(raw).trim());

  const setErrors = validateSet(merged);
  if (Object.keys(setErrors).length > 0) {
    fail(
      "the parameters are individually valid but inconsistent together",
      422,
      "UNPROCESSABLE_ENTITY",
      setErrors,
    );
  }

  const state = getState();
  for (const [key, raw] of Object.entries(incoming)) {
    const value = String(raw).trim();
    const previous = effectiveValue(BY_KEY.get(key) as MockParam);
    if (previous === value) continue;
    setSetting(state, key, value);
    record(key, previous, value);
  }
  saveState();

  return ok(buildCatalog(), "configurable parameters updated");
};

/** Restores one parameter to its default by removing its stored row. */
const deleteParameter: Handler = async (ctx) => {
  await sleep(200);
  const key = String(ctx.params.key ?? "");
  const param = BY_KEY.get(key);
  if (!param) fail("is not a configurable parameter", 404, "NOT_FOUND");
  if (!writable(param)) {
    fail(
      param.derived
        ? "is derived and has no stored value to reset"
        : `is written through ${param.managed_by}`,
      422,
      "UNPROCESSABLE_ENTITY",
    );
  }

  const state = getState();
  const previous = effectiveValue(param);
  state.settings = state.settings.filter((setting) => setting.key !== key);
  saveState();
  // Idempotent: resetting an already-default parameter writes no history row.
  if (previous !== param.default) record(key, previous, param.default);

  return ok(buildCatalog(), "parameter reset to its default");
};

/** US62 — the whole F4 surface's change log, not only the detector's. */
const settingsHistory: Handler = async (ctx) => {
  await sleep(140);
  const key = ctx.query.key ? String(ctx.query.key) : undefined;
  const page = Math.max(1, Number(ctx.query.page ?? 1) || 1);
  const limit = Math.max(1, Number(ctx.query.limit ?? 20) || 20);

  const rows = key ? history.filter((entry) => entry.key === key) : history;
  const start = (page - 1) * limit;

  return ok(rows.slice(start, start + limit), "settings history", {
    page,
    limit,
    total: rows.length,
    total_pages: Math.max(1, Math.ceil(rows.length / limit)),
  });
};

export const parameterMockHandlers: Record<string, Handler> = {
  "GET /settings/parameters": getParameters,
  "PUT /settings/parameters": putParameters,
  "DELETE /settings/parameters/:key": deleteParameter,
  "GET /settings/history": settingsHistory,
};
