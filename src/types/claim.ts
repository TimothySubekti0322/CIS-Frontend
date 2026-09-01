import type { PageParams } from "./common";

/**
 * Unified claim status model — the backend calls it `review_status` and stores
 * it in its own `cis_claim_reviews` table, never in the AI service's
 * `claims.status`. "Prebunk"/"Debunk" were merged into "Action Taken".
 */
export type ClaimStatus = "unreviewed" | "active" | "inactive" | "action_taken";

/** Status filter accepted by the list endpoints. */
export type ClaimStatusFilter = ClaimStatus | "all";

/**
 * `existing`  — scored, confirmed circulating. UI label "Existing Claim".
 * `non_existing` — unscored AI prediction. UI label "Synthetic Claim".
 */
export type ClaimType = "existing" | "non_existing";

export type ClaimTypeFilter = ClaimType | "all";

/** Stance of a source post relative to the claim. */
export type Stance = "positive" | "negative" | "neutral";

/** Minimal topic reference embedded in claim payloads. */
export interface TopicRef {
  id: string;
  name: string;
}

/** A single source post behind a claim (`GET /claims/:id/statements`). */
export interface Statement {
  id: string;
  content: string;
  stance: Stance;
  authorId: string | null;
  postedAt: string | null;
  impressions: number | null;
  sourceUrl: string | null;
}

/** One row of the Top 5 Accounts panel — supporting-side content only. */
export interface TopAccount {
  rank: number;
  authorId: string;
  contentCount: number;
  totalImpressions: number;
}

/** §6.3 composite weights, echoed by the backend so the UI never hardcodes them. */
export interface ScoreWeights {
  reach: number;
  velocity: number;
  falseness: number;
  harm: number;
  emotionalIntensity: number;
}

export interface HarmWeights {
  publicSafety: number;
  institutionalTrust: number;
  economic: number;
  policyDisruption: number;
}

/**
 * The four Harm sub-scores as they stood before a human override (US23, v1.5).
 * `harmScore` is the composite they rolled up to.
 */
export interface HarmEditPrevious {
  publicSafety: number | null;
  institutionalTrust: number | null;
  economic: number | null;
  policyDisruption: number | null;
  harmScore: number | null;
}

/**
 * The human-override audit trail (US23, new in v1.5). **Present only once a
 * reviewer has actually edited the sub-scores** — that presence is what marks
 * an edited Harm distinctly from an AI-original one wherever the score badge
 * appears. `humanConfirmed` cannot do that job: an empty confirmation
 * ("I reviewed these and they are right") sets it too.
 */
export interface HarmEdit {
  editedBy: string | null;
  editedAt: string | null;
  previous: HarmEditPrevious | null;
}

/** Harm sub-scores rolled into `harm`. */
export interface HarmBreakdown {
  publicSafety: number;
  institutionalTrust: number;
  economic: number;
  policyDisruption: number;
  /** True when a reviewer confirmed/overrode the AI's harm assessment. */
  humanConfirmed: boolean;
  weights: HarmWeights | null;
  /** `null` while the values are the AI's originals. See `HarmEdit`. */
  edit: HarmEdit | null;
}

/**
 * Full transparent score breakdown for an Existing claim — the collapsed
 * `finalClaimScore` is never served without its inputs.
 *
 * `npr` and `discountFactor` come back `null` for a dormant claim: it is
 * flagged, never discounted, because its priority must not drop on
 * statistically unreliable data.
 */
export interface ScoreBreakdown {
  reach: number;
  velocity: number;
  falseness: number;
  harm: number;
  emotionalIntensity: number;
  /** Opposing side — diagnostic only, never enters the score. */
  emotionalIntensityOpposing: number;
  harmBreakdown: HarmBreakdown | null;
  /** Composite, pre-discount. */
  claimScore: number;
  npr: number | null;
  discountFactor: number | null;
  finalClaimScore: number;
  isDormant: boolean;
  weights: ScoreWeights | null;
  /** Explanatory note the backend attaches to dormant claims. */
  note: string | null;
  /**
   * US23's info-tooltip sentence, generated from the same weight constants as
   * the score itself — served rather than written into the frontend so the
   * words and the arithmetic can never drift apart.
   */
  formula: string | null;
}

/**
 * The Truth Sandwich, split into three labelled blocks.
 *
 * `null` for every Synthetic claim (their prebunk is flat) and for Existing
 * claims generated before the split existed — in both cases the correct
 * rendering is `content` as one paragraph. Individual blocks can be null too.
 */
export interface DebunkBlocks {
  coreFact: string | null;
  nuancedFlag: string | null;
  reiteratedFact: string | null;
}

/**
 * One audience-segment variant of the Debunk Activity (US12, new in v1.5).
 *
 * v1.5 replaces the single generic draft with one tailored recommendation per
 * segment most exposed to the claim, generated once at claim creation and
 * cached. Ordered most-exposed first.
 */
export interface DebunkSegment {
  segment: string;
  /** Why this segment is exposed — rendered as the card's subtitle. */
  rationale: string | null;
  content: string;
  generatedAt: string | null;
}

/** Debunk (Existing) or Prebunk (Synthetic) draft generated by the AI service. */
export interface ClaimActivity {
  type: "debunk" | "prebunk" | string;
  /** The copyable single paragraph — always the source for copy-to-clipboard. */
  content: string;
  generatedAt: string | null;
  available: boolean;
  debunk: DebunkBlocks | null;
  /**
   * Always an array, never `null` — a nullable list is a branch the UI should
   * not have to write. **Empty** for Synthetic claims and for any deployment
   * whose AI service has not shipped segmentation, where the page falls back
   * to `content`. Never merge the variants into one box: targeting is the
   * whole point of the change.
   */
  segments: DebunkSegment[];
}

/**
 * US61's cross-link from F1 into F5. Absent — not empty — when no network
 * qualifies, which is also what a deployment without the detection pipeline
 * looks like. In both cases there is nothing to show.
 *
 * `reviewStatus` is displayed alongside the band, never folded into it:
 * "Unreviewed, Medium" and "Confirmed, High" must not read identically to an
 * analyst deciding whether to rebut or refer.
 */
export interface CoordinatedNetworkBadge {
  networkId: string;
  label: string;
  coordinationScore: number;
  confidenceBand: "low" | "medium" | "high";
  reviewStatus: string;
  accountCount: number;
  /** How many further networks also qualify; the highest-scoring one is shown. */
  otherCount: number;
}

/** A policy correlated with a claim. */
export interface ClaimPolicyRef {
  id: string;
  name: string;
  /** `cis` — registered through F2. `ai` — created directly by the AI service. */
  source: "cis" | "ai";
  status: "rolled_out" | "not_rolled_out" | null;
  rolledOutDate: string | null;
  hasDocument: boolean | null;
}

/**
 * Claim-card shape, shared by F1's sections, the "See all" lists and the F2
 * policy detail page. Fields a Synthetic claim does not carry are `null`,
 * never `0` — the card must not render a zero score.
 */
export interface ClaimSummary {
  id: string;
  claimType: ClaimType;
  claimStatement: string;
  topic: TopicRef | null;
  reviewStatus: ClaimStatus;
  finalClaimScore: number | null;
  isDormant: boolean;
  isOnAlert: boolean;
  positiveStatementCount: number | null;
  negativeStatementCount: number | null;
  /** When the row was written. On a Synthetic claim this is its "Predicted" date. */
  createdAt: string | null;
  /**
   * When the AI first detected the claim in the wild — the F1 card's "First
   * caught". Distinct from `createdAt`, and absent on a Synthetic claim.
   */
  firstCaughtAt: string | null;
  /** US61 — present only when a qualifying network exists. */
  coordinatedNetwork: CoordinatedNetworkBadge | null;
}

/**
 * The reviewer's decision, from the backend's own `cis_claim_reviews`.
 * `null` until the first `PUT /claims/:id/status`. It is a single overlay row
 * per claim, not a change log: it always reflects the most recent call only,
 * and earlier notes are overwritten rather than retained.
 */
export interface ClaimReview {
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

/** `GET /claims/:id`. */
export interface ClaimDetail extends ClaimSummary {
  updatedAt: string | null;
  review: ClaimReview | null;
  activity: ClaimActivity | null;
  policies: ClaimPolicyRef[];
  /** Present for Existing claims only. */
  scoreBreakdown: ScoreBreakdown | null;
  topAccounts: TopAccount[];
}

/** One section of the F1 page returned by `GET /claims/repository`. */
export interface ClaimRepositorySection {
  /** "S1" (Existing) or "S2" (Non-Existing). */
  section: string;
  claimType: ClaimType;
  sortedBy: string;
  /** Size of the pool behind "See all" — the section itself caps at 10. */
  totalInPool: number;
  claims: ClaimSummary[];
}

/** The whole F1 page in one call. Both sections always return. */
export interface ClaimRepository {
  lastFetchedAt: string | null;
  appliedStatus: ClaimStatusFilter;
  appliedTopics: string[];
  existing: ClaimRepositorySection;
  nonExisting: ClaimRepositorySection;
}

/** One bucket of `GET /claims/:id/score-history` / `GET /alerts/chart`. */
export interface ScorePoint {
  bucketStart: string;
  finalClaimScore: number | null;
  claimScore: number | null;
  sampleCount: number;
}

export type Granularity = "day" | "week" | "month" | "year";

export interface ScoreHistory {
  claimId: string;
  granularity: Granularity;
  points: ScorePoint[];
}

export interface ClaimRepositoryParams {
  status?: ClaimStatusFilter;
  topicIds?: string[];
  /**
   * Free-text search. One value filters BOTH sections — the endpoint takes a
   * single `q`, so the F1 page has one search box rather than one per section.
   */
  q?: string;
}

export interface ClaimListParams extends PageParams {
  type?: ClaimTypeFilter;
  status?: ClaimStatusFilter;
  topicIds?: string[];
  /** Free-text search; `%` and `_` are escaped server-side. */
  q?: string;
  /** Defaults to `score` for Existing, `created_at` for Non-Existing. */
  sort?: "score" | "created_at";
}

export interface StatementListParams extends PageParams {
  stance?: Stance | "all";
}

export interface ScoreHistoryParams {
  granularity?: Granularity;
  from?: string;
  to?: string;
}

export interface UpdateClaimStatusPayload {
  status: ClaimStatus;
  /** Optional reviewer note, max 2000 characters. */
  notes?: string;
}

/**
 * An analyst confirming or overriding the AI's four Harm sub-scores (PRD 6.2.4).
 *
 * Every field is optional and 0–100; an omitted one keeps the AI's own
 * classification. **An empty payload is valid** — it is the "I reviewed these
 * and they are right" case, and still flips `humanConfirmed` to true.
 */
export interface ConfirmHarmPayload {
  publicSafety?: number;
  institutionalTrust?: number;
  economic?: number;
  policyDisruption?: number;
}
