/**
 * Wire → domain translation for F6 (PRD v1.5 §11).
 *
 * Two rules matter more here than anywhere else in the mapping layer, because
 * this is the page a leadership reader trusts at a glance:
 *
 *  - **A missing number stays missing.** `score`, `averageScore`, `momentum`
 *    and `aboveUnderRatio` are all legitimately `null`, and each has a distinct
 *    rendering. Coercing any of them to `0` would print a confident figure the
 *    data does not support.
 *  - **`status` is preserved verbatim.** `insufficient_data` and `unavailable`
 *    mean different things — a quiet week versus an unprovisioned AI column —
 *    and the UI shows `reason` rather than a dial for both.
 */

import type {
  City,
  CityOptions,
  Overview,
  OverviewCity,
  OverviewPolicy,
  OverviewPolicyRef,
  OverviewTopic,
  SentimentBand,
  SentimentIndex,
  SentimentStatus,
  SentimentVolume,
  ThresholdRatio,
  TopicOverview,
  TrendDirection,
} from "@/types/overview";
import type { TopicRef } from "@/types/claim";
import { mapClaimPolicyRef, mapTopicRef } from "./mappers";
import type {
  CityDto,
  CityOptionsDto,
  OverviewCityDto,
  OverviewDto,
  OverviewPolicyDto,
  OverviewPolicyRefDto,
  OverviewTopicDto,
  SentimentDto,
  SentimentVolumeDto,
  ThresholdRatioDto,
  TopicOverviewDto,
} from "./dto.overview";
import { bool, count, list, num, oneOf, optionalOneOf, str, text } from "./primitives";

const SENTIMENT_STATUSES: SentimentStatus[] = [
  "ok",
  "insufficient_data",
  "unavailable",
];
const SENTIMENT_BANDS: SentimentBand[] = ["risky", "watch", "healthy"];
const TREND_DIRECTIONS: TrendDirection[] = ["up", "down", "flat"];

/** A topic reference is required everywhere on this page; fall back to a blank. */
const UNKNOWN_TOPIC: TopicRef = { id: "", name: "—" };

/* -------------------------------- cities -------------------------------- */

export function mapCity(dto: CityDto | null | undefined): City | null {
  const name = str(dto?.name);
  if (!name) return null;
  return {
    name,
    province: text(dto?.province),
    timezone: text(dto?.timezone),
  };
}

export function mapCityOptions(dto: CityOptionsDto | null | undefined): CityOptions {
  return {
    cities: list(dto?.cities)
      .map(mapCity)
      .filter((city): city is City => city !== null),
    selected: mapCity(dto?.selected),
  };
}

/**
 * `partitioned: false` means the AI service does not tag content with a city,
 * so the F4 selection labels this instance rather than filtering it. Defaulting
 * to `false` is the safe direction: it makes the UI say so rather than imply a
 * breakdown the data cannot support.
 */
function mapOverviewCity(
  dto: OverviewCityDto | null | undefined,
): OverviewCity | null {
  const city = mapCity(dto);
  if (!city) return null;
  return { ...city, partitioned: bool(dto?.partitioned) };
}

/* ------------------------------- O1a ratio ------------------------------ */

function mapThresholdRatio(
  dto: ThresholdRatioDto | null | undefined,
): ThresholdRatio {
  return {
    above: count(dto?.above),
    below: count(dto?.below),
    total: count(dto?.total),
    abovePercent: count(dto?.above_percent),
    threshold: num(dto?.threshold),
  };
}

/* -------------------------------- O1b CSI ------------------------------- */

function mapSentimentVolume(
  dto: SentimentVolumeDto | null | undefined,
): SentimentVolume | null {
  if (!dto) return null;
  return {
    total: count(dto.total),
    positive: count(dto.positive),
    negative: count(dto.negative),
    neutral: count(dto.neutral),
  };
}

function mapSentiment(dto: SentimentDto | null | undefined): SentimentIndex {
  // An absent block is not "healthy with no data" — it is unavailable.
  const status = oneOf<SentimentStatus>(
    dto?.status,
    SENTIMENT_STATUSES,
    "unavailable",
  );
  return {
    status,
    // Guarded rather than trusted: `score` is only meaningful when `ok`.
    score: status === "ok" ? num(dto?.score) : null,
    band: optionalOneOf<SentimentBand>(dto?.band, SENTIMENT_BANDS),
    reason: str(dto?.reason),
    bcs: num(dto?.bcs),
    bcsNormalized: num(dto?.bcs_normalized),
    riskLoad: num(dto?.risk_load),
    // Legitimately `null` even when `ok` — hide the arrow, never render a zero.
    momentum: num(dto?.momentum),
    momentumDirection: optionalOneOf<TrendDirection>(
      dto?.momentum_direction,
      TREND_DIRECTIONS,
    ),
    volume: mapSentimentVolume(dto?.volume),
    windowStart: str(dto?.window_start),
    windowEnd: str(dto?.window_end),
    windowDays: num(dto?.window_days),
    minimumVolume: num(dto?.minimum_volume),
    riskThreshold: num(dto?.risk_threshold),
    weightBcs: num(dto?.weight_bcs),
    weightRiskLoad: num(dto?.weight_risk_load),
  };
}

/* ------------------------------- O2 treemap ----------------------------- */

function mapOverviewTopic(dto: OverviewTopicDto): OverviewTopic {
  return {
    topic: mapTopicRef(dto.topic) ?? UNKNOWN_TOPIC,
    claimCount: count(dto.claim_count),
    aboveThresholdCount: count(dto.above_threshold_count),
    // `null` when every claim in the topic is unscored — the topic is still
    // returned, and contributes 0 from the score half of `box_size`.
    averageScore: num(dto.average_score),
    boxSize: count(dto.box_size),
  };
}

/* ----------------------------- O3 leaderboard --------------------------- */

function mapOverviewPolicyRef(dto: OverviewPolicyRefDto): OverviewPolicyRef {
  return {
    ...mapClaimPolicyRef({
      id: dto.id,
      name: text(dto.name),
      source: dto.source,
      status: dto.status,
      rolled_out_date: dto.rolled_out_date,
      has_document: dto.has_document,
    }),
    aiPolicyId: str(dto.ai_policy_id),
  };
}

function mapOverviewPolicy(dto: OverviewPolicyDto, index: number): OverviewPolicy {
  return {
    rank: count(dto.rank, index + 1),
    policy: mapOverviewPolicyRef(dto.policy ?? { id: "" }),
    claimCount: count(dto.claim_count),
    aboveThresholdCount: count(dto.above_threshold_count),
    averageScore: num(dto.average_score),
    score: count(dto.score),
  };
}

/* --------------------------------- page --------------------------------- */

export function mapOverview(dto: OverviewDto | null | undefined): Overview {
  return {
    city: mapOverviewCity(dto?.city),
    generatedAt: str(dto?.generated_at),
    thresholdRatio: mapThresholdRatio(dto?.threshold_ratio),
    sentiment: mapSentiment(dto?.sentiment),
    // Already largest-first from the backend; the order is not re-derived.
    topics: list(dto?.topics).map(mapOverviewTopic),
    policies: list(dto?.policies).map(mapOverviewPolicy),
  };
}

export function mapTopicOverview(
  dto: TopicOverviewDto | null | undefined,
): TopicOverview {
  return {
    topic: mapTopicRef(dto?.topic) ?? UNKNOWN_TOPIC,
    claimCount: count(dto?.claim_count),
    aboveThresholdCount: count(dto?.above_threshold_count),
    belowThresholdCount: count(dto?.below_threshold_count),
    // `null` when nothing is below threshold: printing "Infinity" beside a
    // risk figure is worse than printing nothing.
    aboveUnderRatio: num(dto?.above_under_ratio),
    averageScore: num(dto?.average_score),
    averageScoreMomPercent: num(dto?.average_score_mom_percent),
    momDirection: optionalOneOf<TrendDirection>(
      dto?.mom_direction,
      TREND_DIRECTIONS,
    ),
    currentMonthAverage: num(dto?.current_month_average),
    previousMonthAverage: num(dto?.previous_month_average),
    threshold: num(dto?.threshold),
  };
}
