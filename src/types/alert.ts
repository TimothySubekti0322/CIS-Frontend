import type { Granularity, ScorePoint, TopicRef } from "./claim";
import type { PageParams } from "./common";

/**
 * Derived at read time by comparing `finalClaimScore` to the global
 * threshold — changing the threshold flips these instantly, no recomputation.
 * A `null` score is `under_threshold`: an unscored claim is never escalated
 * on missing data.
 */
export type ThresholdStatus = "over_threshold" | "under_threshold";

/** A row of the watchlist table. */
export interface WatchlistItem {
  /** The claim id — the `:claimId` every other alert endpoint takes. */
  claimId: string;
  /** The watchlist row's own id. */
  alertId: string | null;
  claimStatement: string;
  topic: TopicRef | null;
  /** The claim's own creation date — shown as the "Claim Created Date" column. */
  claimCreatedAt: string | null;
  /** When the operator started watching it. Not the claim's creation date. */
  addedAt: string;
  /** Server-persisted "Chart" checkbox in the watchlist table. */
  chartVisible: boolean;
  finalClaimScore: number | null;
  thresholdStatus: ThresholdStatus;
  /** The global threshold echoed back, so the row can explain itself. */
  threshold: number | null;
  isDormant: boolean;
  /**
   * `true` while this claim's Over/Under status has flipped **since this
   * reader last opened the watchlist** — it drives the light row tint, which
   * is distinct from and lighter than the standing `over_threshold` colour.
   *
   * Per-reader: one operator acknowledging must not clear a colleague's
   * highlight. Only this flag clears on acknowledgment; `crossedAt` and
   * `crossedDirection` stay on the row as a "last moved" record.
   */
  justCrossed: boolean;
  /** `up` = below → above, `down` = above → below. */
  crossedDirection: CrossingDirection | null;
  crossedAt: string | null;
}

/** Which way a watched claim crossed the global threshold. */
export type CrossingDirection = "up" | "down";

/**
 * One claim behind the sidebar badge. Newest first, capped at 20 by the
 * backend — a watchlist where dozens crossed at once is a threshold problem,
 * not a paging problem.
 */
export interface ThresholdCrossing {
  claimId: string;
  claimStatement: string;
  finalClaimScore: number | null;
  thresholdStatus: ThresholdStatus;
  justCrossed: boolean;
  crossedDirection: CrossingDirection | null;
  crossedAt: string | null;
}

/**
 * `GET /alerts/notifications` — the counter on the Alert sidebar item.
 *
 * Acknowledgment is per user, and opening the watchlist is what acknowledges.
 * The acknowledge call must run **after** the rows have rendered:
 * acknowledging is what makes the *next* render unhighlighted, so calling it
 * first would clear the very highlights the user was just told about.
 */
export interface AlertNotifications {
  unacknowledgedCount: number;
  acknowledgedAt: string | null;
  threshold: number | null;
  crossings: ThresholdCrossing[];
}

/** One plotted claim in `GET /alerts/chart`. */
export interface AlertChartSeries {
  claimId: string;
  claimStatement: string;
  topic: TopicRef | null;
  points: ScorePoint[];
}

/** `GET /alerts/chart` — only claims with `chartVisible: true` appear. */
export interface AlertChart {
  granularity: Granularity;
  threshold: number | null;
  /** Fixed 0–100 so the axis never rescales as claims come and go. */
  yAxisMin: number;
  yAxisMax: number;
  series: AlertChartSeries[];
}

export interface WatchlistParams extends PageParams {
  /** Search by claim statement. */
  q?: string;
}

export interface AlertChartParams {
  granularity?: Granularity;
  from?: string;
  to?: string;
}

/** `POST /alerts` result. Re-adding an already-watched claim is not an error. */
export interface AlertSubscription {
  claimId: string;
  onWatchlist: boolean;
  chartVisible: boolean;
  addedAt: string | null;
}

/** One row of `GET /settings`. */
export interface Setting {
  key: string;
  value: string;
  valueType: string;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}
