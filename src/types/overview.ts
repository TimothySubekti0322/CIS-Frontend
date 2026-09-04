import type { ClaimPolicyRef, TopicRef } from "./claim";

/**
 * The whole overview page arrives in one call, mirroring
 * `GET /claims/repository`: three sections are always read together, and three
 * round trips to render one screen buys nothing.
 *
 * Nothing here is stored server-side — every figure is computed on request from
 * the same `claims` rows the repository ranks, so the page can never disagree
 * with the page it summarises.
 */

/** One entry of the city catalog. A closed set held in backend code. */
export interface City {
  name: string;
  province: string;
  /** IANA zone — selecting a city also sets it, so report footers follow. */
  timezone: string;
}

/** `GET /settings/cities` — the dropdown's options plus the current selection. */
export interface CityOptions {
  cities: City[];
  selected: City | null;
}

/**
 * The city the Overview is scoped to. `partitioned: false` means the AI service
 * does not tag content with a city, so the selection **labels** this instance
 * rather than filtering it — surfaced rather than hidden, because a leadership
 * page must not imply a breakdown the data cannot support.
 */
export interface OverviewCity extends City {
  partitioned: boolean;
}

/**
 * Every Existing/Generic claim counted against the global threshold,
 * regardless of review status. An unscored claim counts as *below*:
 * escalating on missing data is the one direction that cannot be defended.
 */
export interface ThresholdRatio {
  above: number;
  below: number;
  total: number;
  abovePercent: number;
  threshold: number | null;
}

/**
 * `ok` — computed. `insufficient_data` — below the minimum volume in the
 * window. `unavailable` — the AI service has not provisioned per-item sentiment.
 * `score` is `null` unless `ok`, and the other sections are unaffected either way.
 */
export type SentimentStatus = "ok" | "insufficient_data" | "unavailable";

/** Red / amber / green banding, served rather than re-derived client-side. */
export type SentimentBand = "risky" | "watch" | "healthy";

export type TrendDirection = "up" | "down" | "flat";

export interface SentimentVolume {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * The Climate Sentiment Index.
 *
 * ```
 * CSI            = BCS_normalized × 0.5 + (100 − RiskLoad) × 0.5
 * BCS            = (positive − negative) / total
 * BCS_normalized = (BCS + 1) / 2 × 100
 * RiskLoad       = Σ(FinalClaimScore_i × Volume_i) / total, for claims ≥ 50
 * ```
 *
 * Every component is returned beside the headline number, same as claim
 * scores — the collapsed figure is never served without its inputs.
 */
export interface SentimentIndex {
  status: SentimentStatus;
  /** `null` unless `status === "ok"`. */
  score: number | null;
  band: SentimentBand | null;
  /** A display-ready sentence for a non-`ok` status. */
  reason: string | null;
  bcs: number | null;
  bcsNormalized: number | null;
  riskLoad: number | null;
  /** The same index over a 24h-lagged window. `null` even when `ok` is valid. */
  momentum: number | null;
  momentumDirection: TrendDirection | null;
  volume: SentimentVolume | null;
  windowStart: string | null;
  windowEnd: string | null;
  windowDays: number | null;
  minimumVolume: number | null;
  riskThreshold: number | null;
  weightBcs: number | null;
  weightRiskLoad: number | null;
}

/**
 * One treemap box per Existing-claim topic, largest first.
 * Synthetic-only topics are excluded so predictions cannot dominate the map.
 */
export interface OverviewTopic {
  topic: TopicRef;
  claimCount: number;
  aboveThresholdCount: number;
  /** `null` when every claim in the topic is unscored. */
  averageScore: number | null;
  /**
   * 0–100 area weight, normalised against the largest topic in *this* result
   * set. Use it directly as the sizing input; it is not comparable between
   * page loads, which is the deliberate cost of keeping a quiet week readable.
   */
  boxSize: number;
}

/** The policy reference this ranking uses, with the AI-side id the backend shadows. */
export interface OverviewPolicyRef extends ClaimPolicyRef {
  aiPolicyId: string | null;
}

/** Ranked by the same combined metric that sizes the topic treemap. */
export interface OverviewPolicy {
  rank: number;
  policy: OverviewPolicyRef;
  claimCount: number;
  aboveThresholdCount: number;
  averageScore: number | null;
  score: number;
}

/** `GET /overview` — the whole overview page. */
export interface Overview {
  city: OverviewCity | null;
  generatedAt: string | null;
  thresholdRatio: ThresholdRatio;
  sentiment: SentimentIndex;
  topics: OverviewTopic[];
  policies: OverviewPolicy[];
}

/** `GET /overview/topics/:id` — the treemap's click-through modal. */
export interface TopicOverview {
  topic: TopicRef;
  claimCount: number;
  aboveThresholdCount: number;
  belowThresholdCount: number;
  /** `above / below` — `null` when nothing is below and the ratio is undefined. */
  aboveUnderRatio: number | null;
  averageScore: number | null;
  /** Month-on-month change of the topic's average score. `null` without history. */
  averageScoreMomPercent: number | null;
  momDirection: TrendDirection | null;
  currentMonthAverage: number | null;
  previousMonthAverage: number | null;
  threshold: number | null;
}

export interface OverviewParams {
  /** Size of the policy leaderboard. Backend default is 5. */
  limit?: number;
}
