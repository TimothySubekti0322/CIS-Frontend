/**
 * Overview and city-settings handlers, served from the same mock state the
 * rest of the app reads.
 *
 * Every figure is recomputed on each request from `state.claims`, exactly as
 * the backend does — nothing is cached. That is what makes the mock useful:
 * edit a claim's Harm sub-scores and the treemap, the leaderboard and the
 * risk half of the sentiment index all move, because they are derived from
 * the same rows rather than from a parallel fixture.
 *
 * The Climate Sentiment Index formulas are transcribed from the backend's
 * `internal/scoring/csi.go`.
 */

import { ApiError } from "@/types/common";
import type {
  OverviewDto,
  OverviewPolicyDto,
  OverviewTopicDto,
  SentimentDto,
  TopicOverviewDto,
} from "../dto.overview";
import { CITY_CATALOG, DEFAULT_THRESHOLD, MOCK_NOW, type MockClaim } from "./data";
import { getSetting, saveState, setSetting, type MockState } from "./store";

/* ----------------------------- shared constants -------------------------- */

/** Claims below this score do not load into the index's risk half. */
const RISK_THRESHOLD = 50;
const WINDOW_DAYS = 7;
/** Below this many content items the index reports `insufficient_data`. */
const MINIMUM_VOLUME = 100;
const WEIGHT_BCS = 0.5;
const WEIGHT_RISK_LOAD = 0.5;

export const CITY_KEY = "city";
export const CITY_TIMEZONE_KEY = "city_timezone";

/* --------------------------------- helpers ------------------------------- */

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function threshold(s: MockState): number {
  const raw = getSetting(s, "alert_threshold")?.value;
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_THRESHOLD;
}

/** Existing/Generic claims only — Synthetic claims carry no score to place. */
function existingClaims(s: MockState): MockClaim[] {
  return s.claims.filter((c) => c.claim_type === "existing");
}

function scoreOf(claim: MockClaim): number | null {
  return claim.score_breakdown?.final_claim_score ?? null;
}

/** An unscored claim is never escalated on missing data — it counts as below. */
function isAbove(claim: MockClaim, t: number): boolean {
  const score = scoreOf(claim);
  return score !== null && score >= t;
}

function averageScore(claims: MockClaim[]): number | null {
  const scores = claims
    .map(scoreOf)
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  return round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}

/**
 * The shared ranking metric for topics and policies, published on every box
 * so the ranking is explainable from the response alone:
 *
 * ```
 * 0.5 × (aboveCount / maxAboveCount × 100) + 0.5 × (avgScore / maxAvgScore × 100)
 * ```
 *
 * Each half is normalised against the largest member of the *current* set. A
 * set where nothing is above threshold contributes 0 from that half rather
 * than dividing by zero, leaving the average score to order the result alone.
 */
function combinedMetric(
  aboveCount: number,
  avgScore: number | null,
  maxAbove: number,
  maxAvg: number,
): number {
  const countHalf = maxAbove > 0 ? (aboveCount / maxAbove) * 100 : 0;
  const scoreHalf = maxAvg > 0 && avgScore !== null ? (avgScore / maxAvg) * 100 : 0;
  return round(0.5 * countHalf + 0.5 * scoreHalf);
}

/* --------------------------- climate sentiment index ---------------------- */

/**
 * ```
 * BCS            = (positive − negative) / total          → −1 … +1
 * BCS_normalized = (BCS + 1) / 2 × 100                    → 0 … 100
 * RiskLoad       = Σ(FinalClaimScore_i × Volume_i) / total, for scores ≥ 50
 * CSI            = BCS_normalized × 0.5 + (100 − RiskLoad) × 0.5
 * ```
 *
 * `momentum` is the same index over a window lagged 24h. It is derived here
 * from the score snapshots, so it moves with the repository rather than being
 * a fixed number pretending to be a trend.
 */
function computeSentiment(s: MockState): SentimentDto {
  const volume = s.contentVolume;
  const windowEnd = new Date(MOCK_NOW).toISOString();
  const windowStart = new Date(MOCK_NOW - WINDOW_DAYS * 86_400_000).toISOString();

  const base = {
    window_start: windowStart,
    window_end: windowEnd,
    window_days: WINDOW_DAYS,
    minimum_volume: MINIMUM_VOLUME,
    risk_threshold: RISK_THRESHOLD,
    weight_bcs: WEIGHT_BCS,
    weight_risk_load: WEIGHT_RISK_LOAD,
    volume: {
      total: volume.total,
      positive: volume.positive,
      negative: volume.negative,
      neutral: volume.neutral,
    },
  };

  // A quiet week must not read as a calm one.
  if (volume.total < MINIMUM_VOLUME) {
    return {
      ...base,
      status: "insufficient_data",
      score: null,
      band: null,
      reason: `Only ${volume.total} climate content items in the last ${WINDOW_DAYS} days, below the minimum of ${MINIMUM_VOLUME} needed to compute the index.`,
      bcs: null,
      bcs_normalized: null,
      risk_load: null,
      momentum: null,
      momentum_direction: null,
    };
  }

  const bcs = (volume.positive - volume.negative) / volume.total;
  const bcsNormalized = ((bcs + 1) / 2) * 100;
  const riskLoad = computeRiskLoad(s, volume.total, volume.perClaim);
  const score = bcsNormalized * WEIGHT_BCS + (100 - riskLoad) * WEIGHT_RISK_LOAD;

  const momentum = computeMomentum(s, volume, riskLoad);

  return {
    ...base,
    status: "ok",
    score: round(score),
    band: bandFor(score),
    reason: null,
    bcs: round(bcs, 3),
    bcs_normalized: round(bcsNormalized),
    risk_load: round(riskLoad),
    momentum: momentum === null ? null : round(momentum),
    momentum_direction:
      momentum === null ? null : momentum > 0.05 ? "up" : momentum < -0.05 ? "down" : "flat",
  };
}

/**
 * Only claims at or above the risk cutoff load the index, so a repository
 * full of low-severity noise does not read as dangerous. Clamped to 100
 * because the weighted sum can in principle exceed the denominator.
 */
function computeRiskLoad(
  s: MockState,
  totalVolume: number,
  perClaim: Record<string, number>,
): number {
  let weighted = 0;
  for (const claim of existingClaims(s)) {
    const score = scoreOf(claim);
    if (score === null || score < RISK_THRESHOLD) continue;
    weighted += score * (perClaim[claim.id] ?? 0);
  }
  return Math.min(100, weighted / totalVolume);
}

/**
 * Direction of change against a window lagged 24h. The lagged risk half is
 * read from yesterday's score snapshots where they exist, so the arrow
 * reflects real movement in the repository rather than noise.
 */
function computeMomentum(
  s: MockState,
  volume: MockState["contentVolume"],
  currentRiskLoad: number,
): number | null {
  const laggedEnd = MOCK_NOW - 86_400_000;

  let weighted = 0;
  let matched = 0;
  for (const claim of existingClaims(s)) {
    // The claim's score *as it stood* 24h ago is the most recent snapshot at
    // or before that moment — not one that happens to fall inside an arbitrary
    // trailing window. Requiring the latter would report "no momentum" purely
    // because a claim was not rescored recently, which is a statement about
    // the job schedule rather than about the conversation.
    const snaps = s.aiSnapshots
      .filter(
        (snap) =>
          snap.claim_id === claim.id && Date.parse(snap.captured_at) <= laggedEnd,
      )
      .sort((a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at));
    if (snaps.length === 0) continue;
    matched += 1;
    const score = snaps[0].final_claim_score;
    if (score < RISK_THRESHOLD) continue;
    weighted += score * (volume.perClaim[claim.id] ?? 0);
  }

  // Without history on the lagged side there is no comparison to make, and a
  // fabricated zero would assert stability the data cannot support.
  if (matched === 0) return null;

  const laggedRiskLoad = Math.min(100, weighted / volume.total);
  // Only the risk half moves between the two windows here — the mock has one
  // sentiment split, so the BCS half cancels out of the difference.
  return (laggedRiskLoad - currentRiskLoad) * WEIGHT_RISK_LOAD;
}

/** Equal thirds — banding is required but no specific cut points are given. */
function bandFor(score: number): "risky" | "watch" | "healthy" {
  if (score < 100 / 3) return "risky";
  if (score < 200 / 3) return "watch";
  return "healthy";
}

/* --------------------------- topics and policies --------------------------- */

function buildTopics(s: MockState, t: number): OverviewTopicDto[] {
  const groups = new Map<string, { name: string; claims: MockClaim[] }>();

  // Only topics that carry Existing claims — a treemap dominated by
  // predictions would be measuring the wrong thing.
  for (const claim of existingClaims(s)) {
    const topic = claim.topic;
    if (!topic) continue;
    const group = groups.get(topic.id) ?? { name: topic.name, claims: [] };
    group.claims.push(claim);
    groups.set(topic.id, group);
  }

  const rows = [...groups.entries()].map(([id, group]) => ({
    id,
    name: group.name,
    claimCount: group.claims.length,
    aboveCount: group.claims.filter((c) => isAbove(c, t)).length,
    avgScore: averageScore(group.claims),
  }));

  const maxAbove = Math.max(0, ...rows.map((r) => r.aboveCount));
  const maxAvg = Math.max(0, ...rows.map((r) => r.avgScore ?? 0));

  return rows
    .map((row) => ({
      topic: { id: row.id, name: row.name },
      claim_count: row.claimCount,
      above_threshold_count: row.aboveCount,
      average_score: row.avgScore,
      box_size: combinedMetric(row.aboveCount, row.avgScore, maxAbove, maxAvg),
    }))
    .sort((a, b) => b.box_size - a.box_size);
}

function buildPolicies(s: MockState, t: number, limit: number): OverviewPolicyDto[] {
  const rows = s.policies.map((policy) => {
    // Only Existing claims count toward a policy's correlated-claim figures.
    const claims = existingClaims(s).filter((c) => c.policy_ids.includes(policy.id));
    return {
      policy,
      claimCount: claims.length,
      aboveCount: claims.filter((c) => isAbove(c, t)).length,
      avgScore: averageScore(claims),
    };
  })
  // A policy with no correlated Existing claims is not "hot", it is absent.
  .filter((row) => row.claimCount > 0);

  const maxAbove = Math.max(0, ...rows.map((r) => r.aboveCount));
  const maxAvg = Math.max(0, ...rows.map((r) => r.avgScore ?? 0));

  return rows
    .map((row) => ({
      ...row,
      score: combinedMetric(row.aboveCount, row.avgScore, maxAbove, maxAvg),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      policy: {
        id: row.policy.id,
        name: row.policy.name,
        source: "cis",
        ai_policy_id: row.policy.ai_policy_id ?? null,
        status: row.policy.status ?? null,
        rolled_out_date: row.policy.rolled_out_date ?? null,
        has_document: Boolean(row.policy.file_name),
      },
      claim_count: row.claimCount,
      above_threshold_count: row.aboveCount,
      average_score: row.avgScore,
      score: row.score,
    }));
}

/* -------------------------------- handlers -------------------------------- */

export function currentCity(s: MockState) {
  const name = getSetting(s, CITY_KEY)?.value;
  return CITY_CATALOG.find((city) => city.name === name) ?? null;
}

export function buildOverview(s: MockState, limit: number): OverviewDto {
  const t = threshold(s);
  const claims = existingClaims(s);
  const above = claims.filter((c) => isAbove(c, t)).length;
  const city = currentCity(s);

  return {
    city: city
      ? {
          ...city,
          // No AI-side city tagging in mock mode, which is the documented
          // single-city deployment rather than a failure. The UI says so.
          partitioned: false,
        }
      : null,
    generated_at: new Date().toISOString(),
    threshold_ratio: {
      above,
      below: claims.length - above,
      total: claims.length,
      above_percent: claims.length === 0 ? 0 : round((above / claims.length) * 100, 2),
      threshold: t,
    },
    sentiment: computeSentiment(s),
    topics: buildTopics(s, t),
    policies: buildPolicies(s, t, limit),
  };
}

export function buildTopicOverview(s: MockState, topicId: string): TopicOverviewDto {
  const t = threshold(s);
  const claims = existingClaims(s).filter((c) => c.topic?.id === topicId);
  const topic = s.topics.find((row) => row.id === topicId);

  if (!topic || claims.length === 0) {
    throw new ApiError("topic not found", 404, "NOT_FOUND");
  }

  const above = claims.filter((c) => isAbove(c, t)).length;
  const below = claims.length - above;
  const avg = averageScore(claims);

  // Month-on-month over the score snapshots, as the backend reads the AI
  // service's per-rescore history rather than its own watchlist-only one.
  const current = monthAverage(s, claims, 0);
  const previous = monthAverage(s, claims, 1);
  const mom =
    current === null || previous === null || previous === 0
      ? null
      : round(((current - previous) / previous) * 100);

  return {
    topic: { id: topic.id, name: topic.name },
    claim_count: claims.length,
    above_threshold_count: above,
    below_threshold_count: below,
    // `null` rather than Infinity when nothing is under threshold.
    above_under_ratio: below === 0 ? null : round(above / below, 2),
    average_score: avg,
    average_score_mom_percent: mom,
    mom_direction: mom === null ? null : mom > 0 ? "up" : mom < 0 ? "down" : "flat",
    current_month_average: current,
    previous_month_average: previous,
    threshold: t,
  };
}

/**
 * Mean snapshot score across a topic's claims, `monthsAgo` months back.
 *
 * Reads `aiSnapshots` — the AI service's per-rescore history for every claim —
 * not the backend's watchlist-only `snapshots`. A month-on-month figure
 * computed over the watchlist would describe which claims the team chose to
 * watch, not how the topic actually moved.
 */
function monthAverage(
  s: MockState,
  claims: MockClaim[],
  monthsAgo: number,
): number | null {
  const end = new Date(MOCK_NOW);
  end.setUTCMonth(end.getUTCMonth() - monthsAgo + 1, 1);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 1);

  const ids = new Set(claims.map((c) => c.id));
  const scores = s.aiSnapshots
    .filter((snap) => {
      if (!ids.has(snap.claim_id)) return false;
      const ts = Date.parse(snap.captured_at);
      return ts >= start.getTime() && ts < end.getTime();
    })
    .map((snap) => snap.final_claim_score);

  if (scores.length === 0) return null;
  return round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}

/* ---------------------------------- cities --------------------------------- */

export function setCity(s: MockState, name: string) {
  const city = CITY_CATALOG.find(
    (row) => row.name.toLowerCase() === name.trim().toLowerCase(),
  );
  if (!city) {
    throw new ApiError(
      `unknown city — see GET /api/v1/settings/cities`,
      422,
      "UNPROCESSABLE_ENTITY",
    );
  }
  setSetting(s, CITY_KEY, city.name);
  // Selecting a city sets the timezone with it, so an instance can never
  // monitor one city while stamping its detector reports in another's local
  // time.
  setSetting(s, CITY_TIMEZONE_KEY, city.timezone);
  saveState();
  return city;
}
