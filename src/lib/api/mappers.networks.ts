/**
 * Wire → domain translation for F5.
 *
 * Same strictness as `mappers.ts`: an omitted field becomes `null` rather than
 * `0`, unknown enum values fall back to the documented default instead of
 * throwing, and `available: false` on a signal is preserved as-is — it means
 * "could not be measured this run", which is not the same as a score of zero.
 */

import type {
  AccountAnnexRow,
  AccountDrawer,
  AllowlistActionResult,
  AllowlistEntry,
  AuditLogEntry,
  BurstBin,
  BurstTimeline,
  ClaimRelevanceBlock,
  CommonPhrase,
  ConfidenceBand,
  ConfidenceExplanation,
  DetectionRun,
  DetectorParamRange,
  DetectorSettings,
  Dismissal,
  DismissalSummary,
  DuplicateGroup,
  EvidencePost,
  ExportEligibility,
  GraphEdge,
  GraphNode,
  NetworkCard,
  NetworkClaimRef,
  NetworkDetail,
  NetworkGraph,
  NetworkListResult,
  NetworkReview,
  NetworkReviewLogEntry,
  NetworkReviewStatus,
  OfftopicCluster,
  OfftopicRate,
  PriorAnchor,
  RecurrenceInfo,
  RepresentativeContent,
  ReportDownload,
  ReportView,
  RunContext,
  SettingHistoryEntry,
  SignalDetail,
  TriggerDetectionResult,
  WhyFlagged,
} from "@/types/network";
import { mapClaimPolicyRef, mapTopicRef } from "./mappers";
import type {
  AccountAnnexRowDto,
  AccountDrawerDto,
  AllowlistActionResultDto,
  AllowlistEntryDto,
  AuditLogEntryDto,
  BurstBinDto,
  BurstTimelineDto,
  ClaimRelevanceBlockDto,
  CommonPhraseDto,
  ConfidenceExplanationDto,
  DetectionRunDto,
  DetectorParamRangeDto,
  DetectorSettingsDto,
  DismissalDto,
  DismissalSummaryDto,
  DuplicateGroupDto,
  EvidencePostDto,
  ExportEligibilityDto,
  GraphEdgeDto,
  GraphNodeDto,
  JsonBagDto,
  NetworkCardDto,
  NetworkClaimRefDto,
  NetworkDetailDto,
  NetworkGraphDto,
  NetworkListDto,
  NetworkReviewDto,
  NetworkReviewLogEntryDto,
  OfftopicClusterDto,
  OfftopicRateDto,
  PriorAnchorRefDto,
  RecurrenceInfoDto,
  RepresentativeContentDto,
  ReportDownloadDto,
  ReportViewDto,
  RunContextDto,
  SettingHistoryEntryDto,
  SignalDetailDto,
  TriggerDetectionResponseDto,
  WhyFlaggedDto,
} from "./dto.networks";
import { bool, count, list, num, oneOf, str, text } from "./primitives";

/* ---------------------------- primitives ---------------------------- */

export const NETWORK_REVIEW_STATUSES: NetworkReviewStatus[] = [
  "unreviewed",
  "under_review",
  "confirmed",
  "dismissed_false_positive",
  "action_taken",
];

const CONFIDENCE_BANDS: ConfidenceBand[] = ["low", "medium", "high"];

/** Opaque `any` bags (raw counts, signal profiles, run parameters). */
function bag(value: JsonBagDto | undefined): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function mapReviewStatus(value: unknown): NetworkReviewStatus {
  return oneOf<NetworkReviewStatus>(value, NETWORK_REVIEW_STATUSES, "unreviewed");
}

export function mapConfidenceBand(value: unknown): ConfidenceBand {
  return oneOf<ConfidenceBand>(value, CONFIDENCE_BANDS, "low");
}

/* ------------------------------ networks ---------------------------- */

export function mapNetworkClaimRef(dto: NetworkClaimRefDto): NetworkClaimRef {
  return {
    claimId: dto.claim_id,
    claimStatement: text(dto.claim_statement),
    claimType: text(dto.claim_type, "existing"),
    topic: mapTopicRef(dto.topic),
    isPrimary: bool(dto.is_primary),
    overlapRatio: count(dto.overlap_ratio),
    anchoringShare: count(dto.anchoring_share),
    claimClusterPostCount: count(dto.claim_cluster_post_count),
    passedRelevanceGate: bool(dto.passed_relevance_gate),
  };
}

function mapPriorAnchor(dto: PriorAnchorRefDto): PriorAnchor {
  return {
    networkId: dto.network_id,
    label: text(dto.label),
    detectedAt: text(dto.detected_at),
    confidenceBand: mapConfidenceBand(dto.confidence_band),
    coordinationScore: count(dto.coordination_score),
    claimId: str(dto.claim_id),
    claimStatement: str(dto.claim_statement),
  };
}

function mapRecurrence(dto: RecurrenceInfoDto | null | undefined): RecurrenceInfo {
  return {
    // A first sighting reads 1, so 1 is the floor rather than 0.
    count: count(dto?.count, 1),
    firstSeenAt: str(dto?.first_seen_at),
    isRecurrence: bool(dto?.is_recurrence),
    priorClaims: list(dto?.prior_claims).map(mapPriorAnchor),
  };
}

export function mapRunContext(dto: RunContextDto | null | undefined): RunContext {
  return {
    runId: text(dto?.run_id),
    triggerSource: text(dto?.trigger_source),
    windowStart: text(dto?.window_start),
    windowEnd: text(dto?.window_end),
    completedAt: str(dto?.completed_at),
    truncated: bool(dto?.truncated),
    candidatesCount: count(dto?.candidates_count),
    signalsUnavailable: list(dto?.signals_unavailable),
    confidenceCappedAtMedium: bool(dto?.confidence_capped_at_medium),
    truncationNote: str(dto?.truncation_note),
  };
}

export function mapNetworkCard(dto: NetworkCardDto): NetworkCard {
  return {
    id: dto.id,
    label: text(dto.label, "Unlabelled network"),
    coordinationScore: count(dto.coordination_score),
    confidenceBand: mapConfidenceBand(dto.confidence_band),
    signalBreadth: count(dto.signal_breadth),
    reviewStatus: mapReviewStatus(dto.review_status),
    accountCount: count(dto.account_count),
    postCount: count(dto.post_count),
    platforms: list(dto.platforms),
    detectedAt: text(dto.detected_at),
    primaryClaim: dto.primary_claim ? mapNetworkClaimRef(dto.primary_claim) : null,
    recurrence: mapRecurrence(dto.recurrence),
    lowConfidence: bool(dto.low_confidence),
    fromTruncatedRun: bool(dto.from_truncated_run),
  };
}

export function mapNetworkList(dto: NetworkListDto): NetworkListResult {
  return {
    networks: list(dto.networks).map(mapNetworkCard),
    statusCounts: dto.status_counts ?? {},
    lowConfidenceShown: bool(dto.low_confidence_shown),
    appliedSort: text(dto.applied_sort, "score"),
  };
}

function mapSignal(dto: SignalDetailDto): SignalDetail {
  return {
    code: text(dto.code),
    name: text(dto.name),
    score: count(dto.score),
    method: text(dto.method),
    rawCounts: bag(dto.raw_counts),
    weight: count(dto.weight),
    // A family the backend never mentions is assumed measured; only an
    // explicit `false` means "unavailable this run".
    available: bool(dto.available, true),
  };
}

function mapConfidenceExplanation(
  dto: ConfidenceExplanationDto | null | undefined,
): ConfidenceExplanation {
  return {
    band: mapConfidenceBand(dto?.band),
    signalBreadth: count(dto?.signal_breadth),
    rule: text(dto?.rule),
    cappedByRun: bool(dto?.capped_by_run),
    note: str(dto?.note),
  };
}

function mapClaimRelevance(
  dto: ClaimRelevanceBlockDto | null | undefined,
): ClaimRelevanceBlock {
  return {
    primaryClaim: dto?.primary_claim ? mapNetworkClaimRef(dto.primary_claim) : null,
    secondaryClaims: list(dto?.secondary_claims).map(mapNetworkClaimRef),
    anchorShareThreshold: count(dto?.anchor_share_threshold),
    minClaimPostsThreshold: count(dto?.min_claim_posts_threshold),
    minLinkStrengthThreshold: count(dto?.min_link_strength_threshold),
  };
}

export function mapWhyFlagged(dto: WhyFlaggedDto | null | undefined): WhyFlagged {
  return {
    coordinationScore: count(dto?.coordination_score),
    signals: list(dto?.signals).map(mapSignal),
    confidence: mapConfidenceExplanation(dto?.confidence),
    signalsUnavailable: list(dto?.signals_unavailable),
    internalDensity: count(dto?.internal_density),
    conductance: count(dto?.conductance),
    comparisonAccountCount: count(dto?.comparison_account_count),
    claimRelevance: mapClaimRelevance(dto?.claim_relevance),
    knownLimitations: list(dto?.known_limitations),
  };
}

function mapExportEligibility(
  dto: ExportEligibilityDto | null | undefined,
): ExportEligibility {
  return {
    // Fail closed: absent means "not allowed", never "allowed".
    allowed: bool(dto?.allowed),
    reason: str(dto?.reason),
    allowedStatuses: list(dto?.allowed_statuses).map(mapReviewStatus),
  };
}

function mapNetworkReview(
  dto: NetworkReviewDto | null | undefined,
): NetworkReview | null {
  if (!dto) return null;
  return {
    status: mapReviewStatus(dto.status),
    reason: text(dto.reason),
    reviewedBy: str(dto.reviewed_by),
    reviewedAt: str(dto.reviewed_at),
  };
}

export function mapNetworkDetail(dto: NetworkDetailDto): NetworkDetail {
  return {
    ...mapNetworkCard(dto),
    run: mapRunContext(dto.run),
    whyFlagged: mapWhyFlagged(dto.why_flagged),
    linkedClaims: list(dto.linked_claims).map(mapNetworkClaimRef),
    linkedPolicies: list(dto.linked_policies).map(mapClaimPolicyRef),
    review: mapNetworkReview(dto.review),
    disclaimer: text(dto.disclaimer),
    export: mapExportEligibility(dto.export),
  };
}

export function mapReviewLogEntry(
  dto: NetworkReviewLogEntryDto,
): NetworkReviewLogEntry {
  return {
    id: dto.id,
    fromStatus: mapReviewStatus(dto.from_status),
    toStatus: mapReviewStatus(dto.to_status),
    reason: text(dto.reason),
    userId: str(dto.user_id),
    createdAt: text(dto.created_at),
    signalProfile: bag(dto.signal_profile),
  };
}

/* -------------------------------- graph ----------------------------- */

export function mapGraphNode(dto: GraphNodeDto): GraphNode {
  return {
    accountId: dto.account_id,
    handle: text(dto.handle),
    platform: text(dto.platform),
    role: text(dto.role, "member"),
    degreeCentrality: count(dto.degree_centrality),
    eigenvectorCentrality: count(dto.eigenvector_centrality),
    postsInCluster: count(dto.posts_in_cluster),
    // Absent coordinates are laid out client-side as a fallback ring; a
    // present pair is used verbatim so screen and PDF agree (PRD 10.8).
    x: num(dto.x),
    y: num(dto.y),
    allowlisted: bool(dto.allowlisted),
  };
}

export function mapGraphEdge(dto: GraphEdgeDto): GraphEdge {
  return {
    source: dto.source,
    target: dto.target,
    weight: count(dto.weight),
    signals: {
      time: count(dto.signals?.w_time),
      text: count(dto.signals?.w_text),
      amp: count(dto.signals?.w_amp),
      meta: count(dto.signals?.w_meta),
      struct: count(dto.signals?.w_struct),
    },
    signalCount: count(dto.signal_count),
  };
}

export function mapNetworkGraph(dto: NetworkGraphDto): NetworkGraph {
  const nodes = list(dto.nodes).map(mapGraphNode);
  return {
    nodes,
    edges: list(dto.edges).map(mapGraphEdge),
    reduced: bool(dto.reduced),
    reductionNote: str(dto.reduction_note),
    totalNodeCount: count(dto.total_node_count, nodes.length),
    memberCount: count(
      dto.member_count,
      nodes.filter((n) => n.role === "member").length,
    ),
    comparisonCount: count(
      dto.comparison_count,
      nodes.filter((n) => n.role === "comparison").length,
    ),
  };
}

/* ------------------------------ timeline ---------------------------- */

function mapBurstBin(dto: BurstBinDto): BurstBin {
  return {
    binStart: dto.bin_start,
    postCount: count(dto.post_count),
    zScore: count(dto.zscore),
    isAnomalous: bool(dto.is_anomalous),
  };
}

export function mapBurstTimeline(dto: BurstTimelineDto): BurstTimeline {
  const bins = list(dto.bins).map(mapBurstBin);
  return {
    binWidthSeconds: count(dto.bin_width_seconds, 60),
    windowStart: text(dto.window_start),
    windowEnd: text(dto.window_end),
    bins,
    anomalousCount: count(
      dto.anomalous_count,
      bins.filter((b) => b.isAnomalous).length,
    ),
  };
}

/* ------------------------------ evidence ---------------------------- */

export function mapEvidencePost(dto: EvidencePostDto): EvidencePost {
  return {
    id: dto.id,
    accountId: text(dto.account_id),
    handle: text(dto.handle),
    platform: text(dto.platform),
    postPlatformId: text(dto.post_platform_id),
    text: text(dto.text),
    postedAt: text(dto.posted_at),
    capturedAt: text(dto.captured_at),
    contentSha256: text(dto.content_sha256),
    isCanonical: bool(dto.is_canonical),
    // A post deleted since capture stays visible, marked — the snapshot is the
    // evidence, and content disappearing is the normal end of a campaign.
    stillPublic: bool(dto.still_public, true),
    availability: text(dto.availability),
    sharedSpanStart: num(dto.shared_span_start),
    sharedSpanEnd: num(dto.shared_span_end),
  };
}

function mapDuplicateGroup(dto: DuplicateGroupDto): DuplicateGroup {
  const variants = list(dto.variants).map(mapEvidencePost);
  return {
    groupId: dto.group_id,
    canonicalText: text(dto.canonical_text),
    variantCount: count(dto.variant_count, variants.length),
    variants,
  };
}

export function mapRepresentativeContent(
  dto: RepresentativeContentDto,
): RepresentativeContent {
  return {
    groups: list(dto.groups).map(mapDuplicateGroup),
    ungrouped: list(dto.ungrouped).map(mapEvidencePost),
    note: str(dto.note),
  };
}

/* --------------------------- account annex -------------------------- */

export function mapAccountAnnexRow(dto: AccountAnnexRowDto): AccountAnnexRow {
  return {
    accountId: dto.account_id,
    handle: text(dto.handle),
    platform: text(dto.platform),
    platformAccountId: text(dto.platform_account_id),
    createdAtPlatform: str(dto.created_at_platform),
    postsInCluster: count(dto.posts_in_cluster),
    duplicationRate: count(dto.duplication_rate),
    medianInterpostSeconds: num(dto.median_interpost_interval_seconds),
    circadianCoverage: count(dto.circadian_coverage),
    degreeCentrality: count(dto.degree_centrality),
    eigenvectorCentrality: count(dto.eigenvector_centrality),
    scoreContribution: bag(dto.score_contribution),
    role: text(dto.role, "member"),
    allowlisted: bool(dto.allowlisted),
  };
}

export function mapAccountDrawer(dto: AccountDrawerDto): AccountDrawer {
  return {
    account: mapAccountAnnexRow(dto.account ?? { account_id: "" }),
    posts: list(dto.posts).map(mapEvidencePost),
    connectingEdges: list(dto.connecting_edges).map(mapGraphEdge),
    explanation: text(dto.explanation),
  };
}

/* ------------------------------- reports ---------------------------- */

export function mapReport(dto: ReportViewDto): ReportView {
  return {
    id: dto.id,
    networkId: text(dto.network_id),
    runId: text(dto.run_id),
    reportType: text(dto.report_type, "platform_referral"),
    fileName: text(dto.file_name),
    fileSha256: text(dto.file_sha256),
    fileSizeBytes: count(dto.file_size_bytes),
    sections: {
      graph: bool(dto.sections?.graph),
      contentClusters: bool(dto.sections?.content_clusters),
      accountAnnex: bool(dto.sections?.account_annex),
      methodology: bool(dto.sections?.methodology),
    },
    redactAnalystNames: bool(dto.redact_analyst_names),
    snapshotId: str(dto.snapshot_id),
    snapshotSha256: str(dto.snapshot_sha256),
    auditId: str(dto.audit_id),
    generatedBy: str(dto.generated_by),
    generatedAt: text(dto.generated_at),
    downloadUrl: text(dto.download_url),
    fileUrl: str(dto.file_url),
    fileUrlExpiresAt: str(dto.file_url_expires_at),
  };
}

export function mapReportDownload(dto: ReportDownloadDto): ReportDownload {
  return {
    reportId: text(dto.report_id),
    fileName: text(dto.file_name),
    mimeType: text(dto.mime_type, "application/octet-stream"),
    sizeBytes: count(dto.size_bytes),
    sha256: text(dto.sha256),
    url: text(dto.url),
    // Absent means signed: only the local storage driver says otherwise, and
    // it says so explicitly.
    isSignedUrl: bool(dto.is_signed_url, true),
    expiresAt: str(dto.expires_at),
  };
}

/* ------------------------------ allowlist --------------------------- */

export function mapAllowlistEntry(dto: AllowlistEntryDto): AllowlistEntry {
  return {
    id: dto.id,
    platform: text(dto.platform),
    platformAccountId: text(dto.platform_account_id),
    handle: text(dto.handle),
    category: text(dto.category, "other"),
    reason: text(dto.reason),
    addedBy: str(dto.added_by),
    addedAt: text(dto.added_at),
    removedBy: str(dto.removed_by),
    removedAt: str(dto.removed_at),
    removalReason: str(dto.removal_reason),
    active: bool(dto.active, true),
  };
}

export function mapAllowlistResult(
  dto: AllowlistActionResultDto,
): AllowlistActionResult {
  return {
    accountsAdded: count(dto.accounts_added),
    networksAffected: count(dto.networks_affected),
    handles: list(dto.handles),
    exportedReportsAffected: list(dto.exported_reports_affected),
    note: str(dto.note),
  };
}

export function mapCommonPhrase(dto: CommonPhraseDto): CommonPhrase {
  return {
    id: dto.id,
    phrase: text(dto.phrase),
    category: text(dto.category, "other"),
    notes: str(dto.notes),
    createdAt: text(dto.created_at),
  };
}

/* --------------------------- detection runs ------------------------- */

export function mapDetectionRun(dto: DetectionRunDto): DetectionRun {
  return {
    runId: dto.run_id,
    status: text(dto.status),
    triggerSource: text(dto.trigger_source),
    scopeClaimIds: list(dto.scope_claim_ids),
    windowStart: text(dto.window_start),
    windowEnd: text(dto.window_end),
    truncated: bool(dto.truncated),
    candidatesCount: count(dto.candidates_count),
    signalsUnavailable: list(dto.signals_unavailable),
    confidenceCappedAtMedium: bool(dto.confidence_capped_at_medium),
    networkCount: count(dto.network_count),
    offtopicCount: count(dto.offtopic_count),
    randomSeed: num(dto.random_seed),
    startedAt: text(dto.started_at),
    completedAt: str(dto.completed_at),
    error: str(dto.error),
    parameters: bag(dto.parameters),
  };
}

export function mapTriggerResult(
  dto: TriggerDetectionResponseDto,
): TriggerDetectionResult {
  return {
    runId: str(dto.run_id),
    status: text(dto.status, "queued"),
    claimIds: list(dto.claim_ids),
    message: text(dto.message),
  };
}

/* ------------------------------ governance -------------------------- */

export function mapOfftopicCluster(dto: OfftopicClusterDto): OfftopicCluster {
  return {
    clusterId: dto.cluster_id,
    runId: text(dto.run_id),
    claimId: text(dto.claim_id),
    claimStatement: str(dto.claim_statement),
    failedTest: text(dto.failed_test),
    overlapRatio: count(dto.overlap_ratio),
    anchoringShare: count(dto.anchoring_share),
    accountCount: count(dto.account_count),
    postCount: count(dto.post_count),
    signals: bag(dto.signals),
    createdAt: text(dto.created_at),
  };
}

export function mapOfftopicRate(dto: OfftopicRateDto): OfftopicRate {
  return {
    runId: dto.run_id,
    startedAt: text(dto.started_at),
    surfacedCount: count(dto.surfaced_count),
    offtopicCount: count(dto.offtopic_count),
    rate: count(dto.rate),
    failedTests: list(dto.failed_tests),
  };
}

export function mapDismissal(dto: DismissalDto): Dismissal {
  return {
    id: dto.id,
    networkId: text(dto.network_id),
    networkLabel: str(dto.network_label),
    reason: text(dto.reason),
    userId: str(dto.user_id),
    createdAt: text(dto.created_at),
    signalProfile: bag(dto.signal_profile),
  };
}

export function mapDismissalSummary(dto: DismissalSummaryDto): DismissalSummary {
  return {
    windowDays: count(dto.window_days, 90),
    confirmed: count(dto.confirmed),
    actionTaken: count(dto.action_taken),
    dismissed: count(dto.dismissed),
    // Null until there is a sample — never rendered as 0% precision.
    precision: num(dto.precision),
    precisionTarget: count(dto.precision_target, 0.85),
    meetsTarget: typeof dto.meets_target === "boolean" ? dto.meets_target : null,
    meanSignalScores: dto.mean_signal_scores ?? null,
    sampleSize: count(dto.sample_size),
    note: str(dto.note),
  };
}

export function mapAuditLogEntry(dto: AuditLogEntryDto): AuditLogEntry {
  return {
    id: dto.id,
    objectType: text(dto.object_type),
    objectId: text(dto.object_id),
    networkId: text(dto.network_id),
    runId: str(dto.run_id),
    exportType: text(dto.export_type),
    userId: str(dto.user_id),
    userName: str(dto.user_name),
    settings: bag(dto.settings),
    createdAt: text(dto.created_at),
  };
}

/* --------------------------- detector settings ---------------------- */

export function mapDetectorSettings(dto: DetectorSettingsDto): DetectorSettings {
  return {
    windowDays: count(dto.window_days, 7),
    binWidthSeconds: count(dto.bin_width_seconds, 60),
    nullModelAlpha: count(dto.null_model_alpha, 0.01),
    dupThreshold: count(dto.dup_threshold, 0.8),
    semThreshold: count(dto.sem_threshold, 0.9),
    minPostLength: count(dto.min_post_length, 25),
    edgeThreshold: count(dto.edge_threshold, 0.35),
    minSignalFamilies: count(dto.min_signal_families, 2),
    kCore: count(dto.k_core, 3),
    leidenResolution: count(dto.leiden_resolution, 1),
    minClusterSize: count(dto.min_cluster_size, 5),
    minInternalDensity: count(dto.min_internal_density, 0.3),
    betaTime: count(dto.beta_time),
    betaText: count(dto.beta_text),
    betaAmp: count(dto.beta_amp),
    betaMeta: count(dto.beta_meta),
    betaStruct: count(dto.beta_struct),
    provenanceHalfLifeHours: count(dto.provenance_half_life_hours, 72),
    anchorShare: count(dto.anchor_share),
    minClaimPosts: count(dto.min_claim_posts),
    minLinkStrength: count(dto.min_link_strength),
    highScoreCutoff: count(dto.high_score_cutoff, 70),
    highBreadthCutoff: count(dto.high_breadth_cutoff, 3),
    mediumScoreCutoff: count(dto.medium_score_cutoff, 55),
    mediumBreadthCutoff: count(dto.medium_breadth_cutoff, 2),
    cadenceHours: count(dto.cadence_hours, 6),
    candidateCap: count(dto.candidate_cap),
    recurrenceThreshold: count(dto.recurrence_threshold),
    velocityTriggerThreshold: count(dto.velocity_trigger_threshold),
    velocityTriggerEnabled: bool(dto.velocity_trigger_enabled),
    updatedAt: str(dto.updated_at),
    updatedBy: str(dto.updated_by),
    selfExclusionCount: count(dto.self_exclusion_count),
  };
}

export function mapParamRange(dto: DetectorParamRangeDto): DetectorParamRange {
  return {
    key: dto.key,
    label: text(dto.label, dto.key),
    symbol: str(dto.symbol),
    min: count(dto.min),
    max: count(dto.max),
    default: count(dto.default),
    unit: str(dto.unit),
    integer: bool(dto.integer),
    note: str(dto.note),
  };
}

export function mapSettingHistory(
  dto: SettingHistoryEntryDto,
): SettingHistoryEntry {
  return {
    id: dto.id,
    key: text(dto.key),
    fromValue: str(dto.from_value),
    toValue: text(dto.to_value),
    changedBy: str(dto.changed_by),
    createdAt: text(dto.created_at),
  };
}
