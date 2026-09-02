import type { PageParams } from "./common";
import type { ClaimPolicyRef, TopicRef } from "./claim";

/**
 * F5 — Coordinated-Network Detector domain types (PRD §10).
 *
 * One rule shapes every type here, and it is PRD 10.9.1's third hard rule: the
 * system never labels an individual account automated, inauthentic or
 * malicious. There is no `isBot`, no `suspicion`, no `verdict` — the nouns are
 * behaviours and counts, and the single judgement in the whole model is
 * `reviewStatus`, which a person set.
 */

/**
 * A human's assessment of a network. Deliberately NOT the F1 claim status set
 * (US52): "we assessed this and concluded it was organic" must be recordable
 * distinctly from "we stopped tracking it".
 */
export type NetworkReviewStatus =
  | "unreviewed"
  | "under_review"
  | "confirmed"
  | "dismissed_false_positive"
  | "action_taken";

export type NetworkStatusFilter = NetworkReviewStatus | "all";

/** Computed from CoordinationScore *and* SignalBreadth — never set by a human. */
export type ConfidenceBand = "low" | "medium" | "high";

/** The five signal families (PRD 10.5.2). */
export type SignalCode = "SY" | "DU" | "CO" | "PR" | "AU";

export type NetworkSort =
  | "score"
  | "detected_at"
  | "accounts"
  | "posts"
  | "recurrences";

/* --------------------------- claim / recurrence --------------------------- */

/** A claim a network is linked to, with the relevance-gate figures for it. */
export interface NetworkClaimRef {
  claimId: string;
  claimStatement: string;
  claimType: string;
  topic: TopicRef | null;
  isPrimary: boolean;
  /** Share of the network's posts that sit inside the claim's own cluster. */
  overlapRatio: number;
  /** Share of members that posted about the claim at all. */
  anchoringShare: number;
  claimClusterPostCount: number;
  passedRelevanceGate: boolean;
}

/** One earlier detection in a recurrence chain. */
export interface PriorAnchor {
  networkId: string;
  label: string;
  detectedAt: string;
  confidenceBand: ConfidenceBand;
  coordinationScore: number;
  claimId: string | null;
  claimStatement: string | null;
}

/** How often this set of accounts has resurfaced (US46, US49). */
export interface RecurrenceInfo {
  /** Includes the current detection, so a first sighting reads 1. */
  count: number;
  firstSeenAt: string | null;
  isRecurrence: boolean;
  priorClaims: PriorAnchor[];
}

/* --------------------------------- run ---------------------------------- */

/**
 * Run-level context every network inherits. Two fields change how the network
 * must be read: a truncated candidate set means known-incomplete recall, and
 * ≥ 2 unavailable signal families caps the run at Medium (PRD 10.6.3 rule 4).
 */
export interface RunContext {
  runId: string;
  triggerSource: string;
  windowStart: string;
  windowEnd: string;
  completedAt: string | null;
  truncated: boolean;
  candidatesCount: number;
  signalsUnavailable: string[];
  confidenceCappedAtMedium: boolean;
  /** Rendered verbatim beside the header when `truncated`. */
  truncationNote: string | null;
}

/* -------------------------------- cards --------------------------------- */

export interface NetworkCard {
  id: string;
  label: string;
  coordinationScore: number;
  confidenceBand: ConfidenceBand;
  signalBreadth: number;
  reviewStatus: NetworkReviewStatus;
  accountCount: number;
  postCount: number;
  platforms: string[];
  detectedAt: string;
  primaryClaim: NetworkClaimRef | null;
  recurrence: RecurrenceInfo;
  /** Revealed only by US43's toggle — render de-emphasised. */
  lowConfidence: boolean;
  /** The run-level caveat, on the card because triage happens on the list. */
  fromTruncatedRun: boolean;
}

/* ----------------------------- why flagged ------------------------------ */

/** One signal family with everything US50 requires beside it. */
export interface SignalDetail {
  code: SignalCode | string;
  name: string;
  score: number;
  /** One-sentence plain-language method — no jargon, by requirement. */
  method: string;
  /** The raw observation behind the normalised score. */
  rawCounts: Record<string, unknown> | null;
  weight: number;
  /** `false` = could not be measured this run. Distinct from a score of zero. */
  available: boolean;
}

/** Which banding rule produced the band, written out (US50). */
export interface ConfidenceExplanation {
  band: ConfidenceBand;
  signalBreadth: number;
  rule: string;
  /** PRD 10.6.3 rule 4 held this below the band its score alone would earn. */
  cappedByRun: boolean;
  note: string | null;
}

/** Answers "is this coordinated *about our claim*?" — not "is it coordinated?" */
export interface ClaimRelevanceBlock {
  primaryClaim: NetworkClaimRef | null;
  secondaryClaims: NetworkClaimRef[];
  anchorShareThreshold: number;
  minClaimPostsThreshold: number;
  minLinkStrengthThreshold: number;
}

/**
 * The US50 panel — the F5 counterpart of US23's score breakdown, carrying the
 * same hard constraint: the composite is never displayed without it.
 */
export interface WhyFlagged {
  coordinationScore: number;
  signals: SignalDetail[];
  confidence: ConfidenceExplanation;
  signalsUnavailable: string[];
  internalDensity: number;
  conductance: number;
  comparisonAccountCount: number;
  claimRelevance: ClaimRelevanceBlock;
  knownLimitations: string[];
}

/* -------------------------------- detail -------------------------------- */

/** Whether a report may be generated, and if not, which condition fails. */
export interface ExportEligibility {
  allowed: boolean;
  reason: string | null;
  allowedStatuses: NetworkReviewStatus[];
}

export interface NetworkReview {
  status: NetworkReviewStatus;
  reason: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface NetworkDetail extends NetworkCard {
  run: RunContext;
  whyFlagged: WhyFlagged;
  linkedClaims: NetworkClaimRef[];
  linkedPolicies: ClaimPolicyRef[];
  review: NetworkReview | null;
  /** PRD 10.9.2's standing text — served, never hard-coded, so it cannot drift. */
  disclaimer: string;
  export: ExportEligibility;
}

export interface NetworkReviewLogEntry {
  id: string;
  fromStatus: NetworkReviewStatus;
  toStatus: NetworkReviewStatus;
  reason: string;
  userId: string | null;
  createdAt: string;
  /** The scores as they stood at the moment of the decision (PRD 10.9.3). */
  signalProfile: Record<string, unknown> | null;
}

/* --------------------------------- graph -------------------------------- */

export interface EdgeSignals {
  time: number;
  text: number;
  amp: number;
  meta: number;
  struct: number;
}

export interface GraphNode {
  accountId: string;
  handle: string;
  platform: string;
  /** `comparison` nodes are genuine unclustered accounts on the same claim. */
  role: "member" | "comparison" | string;
  degreeCentrality: number;
  eigenvectorCentrality: number;
  postsInCluster: number;
  /** Stored ForceAtlas2 coordinates — never recomputed client-side (PRD 10.8). */
  x: number | null;
  y: number | null;
  allowlisted: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  signals: EdgeSignals;
  signalCount: number;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** The graph was rendered as its k-core because it exceeded the node limit. */
  reduced: boolean;
  reductionNote: string | null;
  totalNodeCount: number;
  memberCount: number;
  comparisonCount: number;
}

/* ------------------------------- timeline -------------------------------- */

export interface BurstBin {
  binStart: string;
  postCount: number;
  zScore: number;
  isAnomalous: boolean;
}

export interface BurstTimeline {
  binWidthSeconds: number;
  windowStart: string;
  windowEnd: string;
  bins: BurstBin[];
  anomalousCount: number;
}

/* ------------------------------- evidence -------------------------------- */

export interface EvidencePost {
  id: string;
  accountId: string;
  handle: string;
  platform: string;
  postPlatformId: string;
  text: string;
  postedAt: string;
  capturedAt: string;
  contentSha256: string;
  isCanonical: boolean;
  /** `false` for a post deleted since capture — kept visible, marked. */
  stillPublic: boolean;
  /** The label to render, so UI and PDF read identically. */
  availability: string;
  sharedSpanStart: number | null;
  sharedSpanEnd: number | null;
}

export interface DuplicateGroup {
  groupId: string;
  canonicalText: string;
  variantCount: number;
  variants: EvidencePost[];
}

export interface RepresentativeContent {
  groups: DuplicateGroup[];
  /** Posts in no duplicate group — returned so the evidence set is complete. */
  ungrouped: EvidencePost[];
  note: string | null;
}

/* ----------------------------- account annex ----------------------------- */

/** Every column is a measured behaviour or a graph position. None is a verdict. */
export interface AccountAnnexRow {
  accountId: string;
  handle: string;
  platform: string;
  platformAccountId: string;
  createdAtPlatform: string | null;
  postsInCluster: number;
  duplicationRate: number;
  medianInterpostSeconds: number | null;
  circadianCoverage: number;
  degreeCentrality: number;
  eigenvectorCentrality: number;
  scoreContribution: Record<string, unknown> | null;
  role: "member" | "comparison" | string;
  allowlisted: boolean;
}

/** "No account may appear in a network without a viewable reason" (US55). */
export interface AccountDrawer {
  account: AccountAnnexRow;
  posts: EvidencePost[];
  connectingEdges: GraphEdge[];
  explanation: string;
}

/* -------------------------------- reports -------------------------------- */

export type ReportType = "platform_referral" | "internal_briefing";

export interface ReportSections {
  graph: boolean;
  contentClusters: boolean;
  accountAnnex: boolean;
  methodology: boolean;
}

export interface ReportView {
  id: string;
  networkId: string;
  runId: string;
  reportType: ReportType | string;
  fileName: string;
  fileSha256: string;
  fileSizeBytes: number;
  sections: ReportSections;
  redactAnalystNames: boolean;
  /** Chain of custody (PRD 10.8 item 10). */
  snapshotId: string | null;
  snapshotSha256: string | null;
  auditId: string | null;
  generatedBy: string | null;
  generatedAt: string;
  /** The API path (`/api/v1/reports/:id/file`). Needs a bearer token, so it
   *  cannot be put in an `<a href>` — use `reportsApi.download()` instead. */
  downloadUrl: string;
  /** A signed storage link, returned by the generate endpoints only. Navigable
   *  without a header, and expires within the hour — never persist it. */
  fileUrl: string | null;
  fileUrlExpiresAt: string | null;
}

/**
 * `GET /reports/:id/file?mode=json` — a time-limited link to the artefact,
 * resolved at the moment of the click and never cached.
 *
 * `isSignedUrl` is false only against a locally-stored backend, where `url` is
 * the API path and the bytes must be proxied through an authenticated request.
 */
export interface ReportDownload {
  reportId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  url: string;
  isSignedUrl: boolean;
  expiresAt: string | null;
}

export interface GenerateReportPayload {
  reportType: ReportType;
  includeGraph?: boolean;
  includeContentClusters?: boolean;
  /** Ignored for a platform referral — the annex is mandatory there (US59). */
  includeAccountAnnex?: boolean;
  includeMethodology?: boolean;
  redactAnalystNames?: boolean;
}

/* ------------------------------ allowlist -------------------------------- */

export type AllowlistCategory =
  | "ngo"
  | "newsroom"
  | "campaign_group"
  | "government"
  | "union"
  | "other"
  | "self_exclusion";

export interface AllowlistEntry {
  id: string;
  platform: string;
  /** Entries are keyed on this, not the handle — handles get renamed. */
  platformAccountId: string;
  handle: string;
  category: AllowlistCategory | string;
  reason: string;
  addedBy: string | null;
  addedAt: string;
  removedBy: string | null;
  removedAt: string | null;
  removalReason: string | null;
  active: boolean;
}

export interface AllowlistActionResult {
  accountsAdded: number;
  networksAffected: number;
  handles: string[];
  /** Networks already exported — a PDF citing them is in someone's inbox. */
  exportedReportsAffected: string[];
  note: string | null;
}

export interface CommonPhrase {
  id: string;
  phrase: string;
  category: string;
  notes: string | null;
  createdAt: string;
}

/* --------------------------- detection runs ------------------------------ */

export interface DetectionRun {
  runId: string;
  status: string;
  triggerSource: string;
  scopeClaimIds: string[];
  windowStart: string;
  windowEnd: string;
  truncated: boolean;
  candidatesCount: number;
  signalsUnavailable: string[];
  confidenceCappedAtMedium: boolean;
  networkCount: number;
  offtopicCount: number;
  randomSeed: number | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  /** The configuration in force when the run executed — copied, not looked up. */
  parameters: Record<string, unknown> | null;
}

export interface TriggerDetectionResult {
  runId: string | null;
  status: string;
  claimIds: string[];
  message: string;
}

/* ------------------------ governance / recalibration --------------------- */

export interface OfftopicCluster {
  clusterId: string;
  runId: string;
  claimId: string;
  claimStatement: string | null;
  failedTest: string;
  overlapRatio: number;
  anchoringShare: number;
  accountCount: number;
  postCount: number;
  signals: Record<string, unknown> | null;
  createdAt: string;
}

export interface OfftopicRate {
  runId: string;
  startedAt: string;
  surfacedCount: number;
  offtopicCount: number;
  rate: number;
  failedTests: string[];
}

export interface Dismissal {
  id: string;
  networkId: string;
  networkLabel: string | null;
  reason: string;
  userId: string | null;
  createdAt: string;
  signalProfile: Record<string, unknown> | null;
}

export interface DismissalSummary {
  windowDays: number;
  confirmed: number;
  actionTaken: number;
  dismissed: number;
  /** confirmed + action_taken over all three. Recall is deliberately secondary. */
  precision: number | null;
  precisionTarget: number;
  meetsTarget: boolean | null;
  /** A signal consistently high on rejected networks is the one over-triggering. */
  meanSignalScores: Record<string, number> | null;
  sampleSize: number;
  note: string | null;
}

export interface AuditLogEntry {
  id: string;
  objectType: string;
  objectId: string;
  networkId: string;
  runId: string | null;
  exportType: string;
  userId: string | null;
  userName: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
}

/* --------------------------- detector settings --------------------------- */

/** Every governed detector parameter (PRD 10.11). */
export interface DetectorSettings {
  windowDays: number;
  binWidthSeconds: number;
  nullModelAlpha: number;
  dupThreshold: number;
  semThreshold: number;
  minPostLength: number;
  edgeThreshold: number;
  minSignalFamilies: number;
  kCore: number;
  leidenResolution: number;
  minClusterSize: number;
  minInternalDensity: number;
  betaTime: number;
  betaText: number;
  betaAmp: number;
  betaMeta: number;
  betaStruct: number;
  provenanceHalfLifeHours: number;
  anchorShare: number;
  minClaimPosts: number;
  minLinkStrength: number;
  highScoreCutoff: number;
  highBreadthCutoff: number;
  mediumScoreCutoff: number;
  mediumBreadthCutoff: number;
  cadenceHours: number;
  candidateCap: number;
  recurrenceThreshold: number;
  velocityTriggerThreshold: number;
  velocityTriggerEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  /** Accounts excluded as the city's own comms estate (US62). */
  selfExclusionCount: number;
}

/** One parameter's bounds, straight from PRD 10.11 — never hardcode these. */
export interface DetectorParamRange {
  key: string;
  label: string;
  symbol: string | null;
  min: number;
  max: number;
  default: number;
  unit: string | null;
  integer: boolean;
  note: string | null;
}

export interface SettingHistoryEntry {
  id: string;
  key: string;
  fromValue: string | null;
  toValue: string;
  changedBy: string | null;
  createdAt: string;
}

/* -------------------------------- params --------------------------------- */

export interface NetworkListParams extends PageParams {
  status?: NetworkStatusFilter;
  /** Comma-joined bands. Omit for the default Medium + High set. */
  confidence?: ConfidenceBand[];
  /** US43's toggle. Low networks come back de-emphasised, never mixed in. */
  showLowConfidence?: boolean;
  claimIds?: string[];
  topicIds?: string[];
  policyIds?: string[];
  /** Matches label and member handles, partial handles included (US47). */
  q?: string;
  detectedFrom?: string;
  detectedTo?: string;
  sort?: NetworkSort;
}

export interface NetworkListResult {
  networks: NetworkCard[];
  statusCounts: Record<string, number>;
  lowConfidenceShown: boolean;
  appliedSort: NetworkSort | string;
}

export type AccountSort =
  | "handle"
  | "posts_in_cluster"
  | "duplication_rate"
  | "centrality"
  | "created_at_platform"
  | "circadian_coverage"
  | "median_interpost";

export interface AccountAnnexParams extends PageParams {
  role?: "member" | "comparison";
  q?: string;
  sort?: AccountSort;
}

export interface UpdateNetworkStatusPayload {
  status: NetworkReviewStatus;
  /** Required, minimum 20 characters — unlike F1's optional claim notes. */
  reason: string;
}

export interface AllowlistParams extends PageParams {
  q?: string;
  platform?: string;
  category?: AllowlistCategory;
  includeRemoved?: boolean;
}

export interface AllowlistPayload {
  category: AllowlistCategory;
  /** Min 10 characters. */
  reason: string;
}

export interface CreateAllowlistEntryPayload extends AllowlistPayload {
  platform: string;
  platformAccountId: string;
  handle: string;
}

export interface DetectionRunListParams extends PageParams {
  status?: string;
  trigger?: "scheduled" | "velocity" | "on_demand";
  truncated?: boolean;
  from?: string;
  to?: string;
}

export interface OfftopicClusterParams extends PageParams {
  runId?: string;
  claimId?: string;
  failedTest?: "anchoring" | "evidence_volume" | "link_strength";
  from?: string;
  to?: string;
}

export interface AuditLogParams extends PageParams {
  userId?: string;
  networkId?: string;
  runId?: string;
  exportType?: string;
  from?: string;
  to?: string;
}
