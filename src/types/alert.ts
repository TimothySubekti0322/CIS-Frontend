/** PRD §8 US29 — derived by comparing FinalClaimScore to the global threshold. */
export type ThresholdStatus = "over" | "under";

/** A row in the F3 Alert watchlist table [C3] (PRD US29). */
export interface WatchlistItem {
  claimId: string;
  statement: string;
  claimCreatedAt: string;
  finalClaimScore: number;
  thresholdStatus: ThresholdStatus;
  /** Timestamp the claim was appended via the F1 bell confirmation (PRD US30). */
  addedAt: string;
  /** Historical FinalClaimScore series for the chart [C1] (PRD US27). */
  history: ScorePoint[];
}

export interface ScorePoint {
  date: string;
  score: number;
}

export interface AdminSettings {
  /** Global Over/Under threshold on the 0–100 scale (PRD US32). */
  alertThreshold: number;
}
