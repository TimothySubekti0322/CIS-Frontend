/**
 * Unified claim status model — PRD v1.3 §4 US1.
 * "Prebunk" and "Debunk" were merged into the single shared "Action Taken".
 */
export type ClaimStatus = "unreviewed" | "active" | "inactive" | "action_taken";

export type ClaimType = "generic" | "synthetic";

/** A single source post/statement rolled into a claim (PRD US3, US12). */
export interface Statement {
  id: string;
  text: string;
  sentiment: "positive" | "negative";
  author?: string;
  postedAt?: string;
}

/** One of the Top 5 Accounts driving a claim (PRD US12 — interpretation flagged). */
export interface TopAccount {
  rank: number;
  handle: string;
  /** Contribution to the claim's spread, e.g. post count or reach. */
  contribution: number;
  contributionLabel: string;
}

/**
 * Full transparent score breakdown for an Existing/Generic claim.
 * PRD §6.5 — every value must be shown alongside FinalClaimScore (US23).
 */
export interface ScoreBreakdown {
  /** Reach & Spread (0–100) */
  r: number;
  /** Velocity (0–100) */
  v: number;
  /** Falseness Confidence (0–100) */
  f: number;
  /** Harm Severity (0–100) */
  h: number;
  /** Emotional/Moral Intensity — supporting side (0–100) */
  ei: number;
  /** Composite Claim Score, pre-discount (0–100) */
  claimScore: number;
  /** Net Pushback Ratio (0–1) */
  npr: number;
  /** Discount factor applied to claimScore (0.5–1) */
  discountFactor: number;
  /** FinalClaimScore — the number used for ranking within S1 (0–100) */
  finalClaimScore: number;
  /** EI on the opposing side — diagnostic only, never scored (PRD §6.4.6, US24) */
  eiOpposing: number;
  /** True when supporting + opposing volume is 0 (PRD §6.4.7, US25) */
  dormant: boolean;
}

export interface PolicyRef {
  id: string;
  name: string;
}

interface ClaimBase {
  id: string;
  statement: string;
  topicId: string;
  topicLabel: string;
  status: ClaimStatus;
}

/** Existing / Generic claim — lives in section [S1] (PRD §4.2). */
export interface GenericClaim extends ClaimBase {
  type: "generic";
  score: ScoreBreakdown;
  /** First-caught date by the AI (PRD US10). */
  firstCaughtAt: string;
  positiveCount: number;
  negativeCount: number;
  onWatchlist: boolean;
}

/** Full detail payload for a generic claim (PRD US12). */
export interface GenericClaimDetail extends GenericClaim {
  topAccounts: TopAccount[];
  debunkContent: string;
  correlatedPolicies: PolicyRef[];
  positiveStatements: Statement[];
  negativeStatements: Statement[];
}

/** Non-Existing / Synthetic claim — lives in section [S2] (PRD §4.3). Not scored. */
export interface SyntheticClaim extends ClaimBase {
  type: "synthetic";
  createdAt: string;
}

/** Full detail payload for a synthetic claim (PRD US20). */
export interface SyntheticClaimDetail extends SyntheticClaim {
  prebunkContent: string;
  /** Synthetic claims link to exactly one policy (one-to-many, PRD US20). */
  correlatedPolicy: PolicyRef | null;
}

export interface ClaimListParams {
  topicIds?: string[];
  status?: ClaimStatus | "all";
  search?: string;
  limit?: number;
}
