import type { Granularity, ScorePoint, TopicRef } from "./claim";
import type { PageParams } from "./common";

/**
 * Derived at read time by comparing `finalClaimScore` to the F4 global
 * threshold — changing the threshold flips these instantly, no recomputation.
 * A `null` score is `under_threshold`: an unscored claim is never escalated
 * on missing data.
 */
export type ThresholdStatus = "over_threshold" | "under_threshold";

/** A row of the F3 watchlist table. */
export interface WatchlistItem {
  /** The claim id — the `:claimId` every other alert endpoint takes. */
  claimId: string;
  /** The watchlist row's own id. */
  alertId: string | null;
  claimStatement: string;
  topic: TopicRef | null;
  addedAt: string;
  /** Server-persisted "Chart" checkbox in the watchlist table. */
  chartVisible: boolean;
  finalClaimScore: number | null;
  thresholdStatus: ThresholdStatus;
  /** The global threshold echoed back, so the row can explain itself. */
  threshold: number | null;
  isDormant: boolean;
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
