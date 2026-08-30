/**
 * The single translation boundary between the backend's wire format and the
 * domain types the UI renders.
 *
 * Rules kept deliberately strict:
 *  - a field the backend omits becomes `null`, never `0` or `""` — a Synthetic
 *    claim's absent score must not render as a zero score;
 *  - unknown enum values fall back to the documented default rather than
 *    throwing, so an added backend status never blanks a page;
 *  - counts default to `0` only where the backend guarantees the field.
 */

import type {
  ClaimActivity,
  ClaimDetail,
  ClaimPolicyRef,
  ClaimRepository,
  ClaimRepositorySection,
  ClaimStatus,
  ClaimSummary,
  ClaimType,
  Granularity,
  HarmBreakdown,
  ScoreBreakdown,
  ScoreHistory,
  ScorePoint,
  ScoreWeights,
  Stance,
  Statement,
  TopAccount,
  TopicRef,
} from "@/types/claim";
import type {
  Policy,
  PolicyDetail,
  PolicyProcessing,
  PolicyProcessingStatus,
  PolicyStatus,
} from "@/types/policy";
import type {
  AlertChart,
  AlertChartSeries,
  AlertSubscription,
  Setting,
  ThresholdStatus,
  WatchlistItem,
} from "@/types/alert";
import type { AuthSession, User } from "@/types/auth";
import type { PageMeta, PageMetaDto, Topic } from "@/types/common";
import type {
  AlertChartDto,
  AlertChartSeriesDto,
  AlertSubscriptionDto,
  AuthSessionDto,
  ClaimActivityDto,
  ClaimDetailDto,
  ClaimDto,
  ClaimPolicyRefDto,
  ClaimRepositoryDto,
  ClaimRepositorySectionDto,
  HarmBreakdownDto,
  PolicyDetailDto,
  PolicyDto,
  PolicyProcessingDto,
  ScoreBreakdownDto,
  ScoreHistoryDto,
  ScorePointDto,
  ScoreWeightsDto,
  SettingDto,
  StatementDto,
  TopAccountDto,
  TopicDto,
  TopicRefDto,
  UserDto,
  WatchlistItemDto,
} from "./dto";

/* ---------------------------- primitives ---------------------------- */

const CLAIM_STATUSES: ClaimStatus[] = [
  "unreviewed",
  "active",
  "inactive",
  "action_taken",
];

const POLICY_PROCESSING_STATUSES: PolicyProcessingStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
];

const GRANULARITIES: Granularity[] = ["day", "week", "month", "year"];

/** `null` unless the value is a real, finite number. */
function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** A number with a floor — for counts the backend always sends. */
function count(value: unknown, fallback = 0): number {
  return num(value) ?? fallback;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function mapMeta(meta: PageMetaDto | undefined, itemCount: number): PageMeta {
  return {
    page: count(meta?.page, 1),
    limit: count(meta?.limit, itemCount),
    total: count(meta?.total, itemCount),
    totalPages: count(meta?.total_pages, 1),
  };
}

/* ------------------------------- auth ------------------------------- */

export function mapUser(dto: UserDto | null | undefined): User | null {
  if (!dto?.id) return null;
  return {
    id: dto.id,
    email: dto.email ?? "",
    name: dto.name ?? "",
    lastLoginAt: str(dto.last_login_at),
    createdAt: str(dto.created_at),
  };
}

export function mapAuthSession(dto: AuthSessionDto): AuthSession {
  return {
    user: mapUser(dto.user),
    accessToken: dto.access_token,
    refreshToken: str(dto.refresh_token),
    tokenType: str(dto.token_type) ?? "Bearer",
    expiresIn: num(dto.expires_in),
  };
}

/* ------------------------------ topics ------------------------------ */

export function mapTopic(dto: TopicDto): Topic {
  return {
    id: dto.id,
    name: dto.name,
    description: str(dto.description),
    existingClaimCount: count(dto.existing_claim_count),
    nonExistingClaimCount: count(dto.non_existing_claim_count),
  };
}

export function mapTopicRef(dto: TopicRefDto | null | undefined): TopicRef | null {
  if (!dto?.id) return null;
  return { id: dto.id, name: dto.name ?? "" };
}

/* ------------------------------ claims ------------------------------ */

function mapClaimType(value: unknown): ClaimType {
  return oneOf<ClaimType>(value, ["existing", "non_existing"], "existing");
}

function mapWeights(dto: ScoreWeightsDto | null | undefined): ScoreWeights | null {
  if (!dto) return null;
  return {
    reach: count(dto.reach),
    velocity: count(dto.velocity),
    falseness: count(dto.falseness),
    harm: count(dto.harm),
    emotionalIntensity: count(dto.emotional_intensity),
  };
}

function mapHarmBreakdown(
  dto: HarmBreakdownDto | null | undefined,
): HarmBreakdown | null {
  if (!dto) return null;
  return {
    publicSafety: count(dto.public_safety),
    institutionalTrust: count(dto.institutional_trust),
    economic: count(dto.economic),
    policyDisruption: count(dto.policy_disruption),
    humanConfirmed: bool(dto.human_confirmed),
    weights: dto.weights
      ? {
          publicSafety: count(dto.weights.public_safety),
          institutionalTrust: count(dto.weights.institutional_trust),
          economic: count(dto.weights.economic),
          policyDisruption: count(dto.weights.policy_disruption),
        }
      : null,
  };
}

export function mapScoreBreakdown(
  dto: ScoreBreakdownDto | null | undefined,
): ScoreBreakdown | null {
  if (!dto) return null;
  return {
    reach: count(dto.reach),
    velocity: count(dto.velocity),
    falseness: count(dto.falseness),
    harm: count(dto.harm),
    emotionalIntensity: count(dto.emotional_intensity),
    emotionalIntensityOpposing: count(dto.emotional_intensity_opposing),
    harmBreakdown: mapHarmBreakdown(dto.harm_breakdown),
    claimScore: count(dto.claim_score),
    // Dormant claims come back with both of these null — flagged, not discounted.
    npr: num(dto.npr),
    discountFactor: num(dto.discount_factor),
    finalClaimScore: count(dto.final_claim_score),
    isDormant: bool(dto.is_dormant),
    weights: mapWeights(dto.weights),
    note: str(dto.note),
  };
}

function mapActivity(
  dto: ClaimActivityDto | null | undefined,
): ClaimActivity | null {
  if (!dto) return null;
  const content = str(dto.content);
  return {
    type: str(dto.type) ?? "debunk",
    content: content ?? "",
    generatedAt: str(dto.generated_at),
    // `available: false` and an empty body both mean "nothing to show yet".
    available: bool(dto.available, Boolean(content)),
  };
}

export function mapClaimPolicyRef(dto: ClaimPolicyRefDto): ClaimPolicyRef {
  return {
    id: dto.id,
    name: dto.name,
    source: dto.source === "ai" ? "ai" : "cis",
    status: oneOf<PolicyStatus | "">(
      dto.status,
      ["rolled_out", "not_rolled_out", ""],
      "",
    ) || null,
    rolledOutDate: str(dto.rolled_out_date),
    hasDocument: typeof dto.has_document === "boolean" ? dto.has_document : null,
  };
}

export function mapTopAccount(dto: TopAccountDto, index: number): TopAccount {
  return {
    rank: count(dto.rank, index + 1),
    authorId: str(dto.author_id) ?? "—",
    contentCount: count(dto.content_count),
    totalImpressions: count(dto.total_impressions),
  };
}

/**
 * Claim card / list row. Score, statement counts and alert state are absent
 * (not zero) on a Synthetic claim, so they map to `null`/`false`.
 */
export function mapClaimSummary(dto: ClaimDto): ClaimSummary {
  const isExisting = mapClaimType(dto.claim_type) === "existing";
  return {
    id: dto.id,
    claimType: mapClaimType(dto.claim_type),
    claimStatement: dto.claim_statement ?? "",
    topic: mapTopicRef(dto.topic),
    reviewStatus: oneOf<ClaimStatus>(
      dto.review_status,
      CLAIM_STATUSES,
      "unreviewed",
    ),
    finalClaimScore: isExisting ? num(dto.final_claim_score) : null,
    isDormant: bool(dto.is_dormant),
    isOnAlert: bool(dto.is_on_alert),
    positiveStatementCount: isExisting ? num(dto.positive_statement_count) : null,
    negativeStatementCount: isExisting ? num(dto.negative_statement_count) : null,
    createdAt: str(dto.created_at) ?? str(dto.first_caught_at) ?? str(dto.detected_at),
  };
}

export function mapClaimDetail(dto: ClaimDetailDto): ClaimDetail {
  return {
    ...mapClaimSummary(dto),
    activity: mapActivity(dto.activity),
    policies: (dto.policies ?? []).map(mapClaimPolicyRef),
    scoreBreakdown: mapScoreBreakdown(dto.score_breakdown),
    topAccounts: (dto.top_accounts ?? []).map(mapTopAccount),
  };
}

/**
 * `GET /claims/:id/statements` has no documented response schema, so this
 * accepts the plausible spellings for each field. See MISSING_ENDPOINT.MD §1.
 */
export function mapStatement(dto: StatementDto, index: number): Statement {
  const stance = str(dto.stance) ?? str(dto.sentiment);
  return {
    id: dto.id ?? `stmt_${index}`,
    content: str(dto.content) ?? str(dto.text) ?? str(dto.statement) ?? "",
    stance: oneOf<Stance>(stance, ["positive", "negative", "neutral"], "neutral"),
    authorId: str(dto.author_id) ?? str(dto.author),
    postedAt: str(dto.posted_at) ?? str(dto.created_at),
    impressions: num(dto.impressions),
    sourceUrl: str(dto.source_url) ?? str(dto.url),
  };
}

function mapRepositorySection(
  dto: ClaimRepositorySectionDto | null | undefined,
  fallbackType: ClaimType,
  fallbackSection: string,
): ClaimRepositorySection {
  const claims = (dto?.claims ?? []).map(mapClaimSummary);
  return {
    section: str(dto?.section) ?? fallbackSection,
    claimType: dto?.claim_type ? mapClaimType(dto.claim_type) : fallbackType,
    sortedBy: str(dto?.sorted_by) ?? "",
    totalInPool: count(dto?.total_in_pool, claims.length),
    claims,
  };
}

export function mapClaimRepository(dto: ClaimRepositoryDto): ClaimRepository {
  return {
    lastFetchedAt: str(dto.last_fetched_at),
    appliedStatus: oneOf<ClaimStatus | "all">(
      dto.applied_status,
      [...CLAIM_STATUSES, "all"],
      "all",
    ),
    appliedTopics: dto.applied_topics ?? [],
    existing: mapRepositorySection(dto.existing, "existing", "S1"),
    nonExisting: mapRepositorySection(dto.non_existing, "non_existing", "S2"),
  };
}

export function mapScorePoint(dto: ScorePointDto): ScorePoint {
  return {
    bucketStart: dto.bucket_start,
    finalClaimScore: num(dto.final_claim_score),
    claimScore: num(dto.claim_score),
    sampleCount: count(dto.sample_count),
  };
}

export function mapScoreHistory(dto: ScoreHistoryDto, claimId: string): ScoreHistory {
  return {
    claimId: str(dto.claim_id) ?? claimId,
    granularity: oneOf<Granularity>(dto.granularity, GRANULARITIES, "week"),
    points: (dto.points ?? []).map(mapScorePoint),
  };
}

/* ----------------------------- policies ----------------------------- */

function mapPolicyStatus(value: unknown): PolicyStatus {
  return oneOf<PolicyStatus>(
    value,
    ["rolled_out", "not_rolled_out"],
    "not_rolled_out",
  );
}

function mapProcessingStatus(value: unknown): PolicyProcessingStatus {
  return oneOf<PolicyProcessingStatus>(
    value,
    POLICY_PROCESSING_STATUSES,
    "pending",
  );
}

export function mapPolicy(dto: PolicyDto): Policy {
  const processingStatus = mapProcessingStatus(dto.processing_status);
  return {
    id: dto.id,
    name: dto.name ?? "",
    description: str(dto.description),
    monthYear: str(dto.month_year),
    rolledOutDate: str(dto.rolled_out_date),
    status: mapPolicyStatus(dto.status),
    fileName: str(dto.file_name),
    downloadUrl: str(dto.download_url),
    processingStatus,
    // Trust the backend's flag; derive it only when the field is absent.
    isProcessing: bool(
      dto.is_processing,
      processingStatus === "pending" || processingStatus === "processing",
    ),
    processingError: str(dto.processing_error),
    linkedClaimCount: count(dto.linked_claim_count),
    aiPolicyId: str(dto.ai_policy_id),
    createdAt: str(dto.created_at),
  };
}

export function mapPolicyDetail(dto: PolicyDetailDto): PolicyDetail {
  return {
    ...mapPolicy(dto),
    existingClaims: (dto.existing_claims ?? []).map((c) =>
      mapClaimSummary({ claim_type: "existing", ...c }),
    ),
    nonExistingClaims: (dto.non_existing_claims ?? []).map((c) =>
      mapClaimSummary({ claim_type: "non_existing", ...c }),
    ),
  };
}

export function mapPolicyProcessing(
  dto: PolicyProcessingDto,
  policyId: string,
): PolicyProcessing {
  const processingStatus = mapProcessingStatus(dto.processing_status);
  return {
    policyId: str(dto.policy_id) ?? policyId,
    processingStatus,
    isProcessing: bool(
      dto.is_processing,
      processingStatus === "pending" || processingStatus === "processing",
    ),
    attempts: count(dto.attempts),
    processedAt: str(dto.processed_at),
    aiPolicyId: str(dto.ai_policy_id),
    linkedClaimCount: count(dto.linked_claim_count),
    processingError: str(dto.processing_error),
  };
}

/* ------------------------------ alerts ------------------------------ */

function mapThresholdStatus(value: unknown): ThresholdStatus {
  return value === "over_threshold" ? "over_threshold" : "under_threshold";
}

export function mapWatchlistItem(dto: WatchlistItemDto): WatchlistItem {
  return {
    // `id` on this payload is the CLAIM id — every alert route takes it as :claimId.
    claimId: dto.id,
    alertId: str(dto.alert_id),
    claimStatement: dto.claim_statement ?? "",
    topic: mapTopicRef(dto.topic),
    addedAt: dto.added_at,
    chartVisible: bool(dto.chart_visible),
    finalClaimScore: num(dto.final_claim_score),
    thresholdStatus: mapThresholdStatus(dto.threshold_status),
    threshold: num(dto.threshold),
    isDormant: bool(dto.is_dormant),
  };
}

export function mapAlertSubscription(
  dto: AlertSubscriptionDto,
  claimId: string,
): AlertSubscription {
  return {
    claimId: str(dto.claim_id) ?? claimId,
    onWatchlist: bool(dto.on_watchlist, true),
    chartVisible: bool(dto.chart_visible),
    addedAt: str(dto.added_at),
  };
}

function mapAlertSeries(dto: AlertChartSeriesDto): AlertChartSeries {
  return {
    claimId: dto.claim_id,
    claimStatement: str(dto.claim_statement) ?? "",
    topic: mapTopicRef(dto.topic),
    points: (dto.points ?? []).map(mapScorePoint),
  };
}

export function mapAlertChart(dto: AlertChartDto): AlertChart {
  return {
    granularity: oneOf<Granularity>(dto.granularity, GRANULARITIES, "week"),
    threshold: num(dto.threshold),
    // Fixed 0-100 so the axis never rescales as claims are ticked on and off.
    yAxisMin: count(dto.y_axis_min, 0),
    yAxisMax: count(dto.y_axis_max, 100),
    series: (dto.series ?? []).map(mapAlertSeries),
  };
}

/* ----------------------------- settings ----------------------------- */

export function mapSetting(dto: SettingDto): Setting {
  return {
    key: dto.key,
    value: dto.value ?? "",
    valueType: str(dto.value_type) ?? "string",
    description: str(dto.description),
    updatedAt: str(dto.updated_at),
    updatedBy: str(dto.updated_by),
  };
}

/** `GET /settings/alert-threshold` has no documented body shape. */
export function mapThreshold(dto: unknown, fallback = 70): number {
  if (typeof dto === "number") return dto;
  if (dto && typeof dto === "object") {
    const record = dto as Record<string, unknown>;
    return num(record.threshold) ?? num(record.value) ?? fallback;
  }
  return num(dto) ?? fallback;
}
