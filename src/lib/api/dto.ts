/**
 * Wire shapes, snake_case, exactly as the CIS backend sends them.
 *
 * Nothing outside `mappers.ts` should import from this file — components and
 * hooks work with the camelCase domain types in `src/types/`. Keeping the two
 * apart means a backend field rename is a one-line change in the mapper.
 *
 * The canonical field-by-field tables live in the backend repo's `docs/api/`;
 * the runbook is the abridged mirror of those. Where a shape is not reproduced
 * in the runbook (statements, in particular), the mapper reads defensively
 * across the plausible spellings — see MISSING_ENDPOINT.MD.
 */

/* ------------------------------- auth ------------------------------- */

export interface UserDto {
  id: string;
  email: string;
  name: string;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface AuthSessionDto {
  user?: UserDto | null;
  access_token: string;
  refresh_token?: string | null;
  token_type?: string | null;
  expires_in?: number | null;
}

/* ------------------------------ topics ------------------------------ */

export interface TopicDto {
  id: string;
  name: string;
  description?: string | null;
  existing_claim_count?: number | null;
  non_existing_claim_count?: number | null;
}

export interface TopicRefDto {
  id: string;
  name: string;
}

/* ------------------------------ claims ------------------------------ */

export interface ScoreWeightsDto {
  reach?: number;
  velocity?: number;
  falseness?: number;
  harm?: number;
  emotional_intensity?: number;
}

export interface HarmWeightsDto {
  public_safety?: number;
  institutional_trust?: number;
  economic?: number;
  policy_disruption?: number;
}

export interface HarmEditPreviousDto {
  public_safety?: number | null;
  institutional_trust?: number | null;
  economic?: number | null;
  policy_disruption?: number | null;
  harm_score?: number | null;
}

/**
 * New in v1.5 (US23). **Omitted while the values are the AI's originals** —
 * its presence, not `human_confirmed`, is what marks an edited Harm, because
 * an empty confirmation sets the boolean too.
 */
export interface HarmEditDto {
  edited_by?: string | null;
  edited_at?: string | null;
  previous?: HarmEditPreviousDto | null;
}

export interface HarmBreakdownDto {
  public_safety?: number;
  institutional_trust?: number;
  economic?: number;
  policy_disruption?: number;
  human_confirmed?: boolean;
  weights?: HarmWeightsDto | null;
  edit?: HarmEditDto | null;
}

export interface ScoreBreakdownDto {
  reach?: number;
  velocity?: number;
  falseness?: number;
  harm?: number;
  emotional_intensity?: number;
  emotional_intensity_opposing?: number;
  harm_breakdown?: HarmBreakdownDto | null;
  claim_score?: number;
  /** `null` for a dormant claim — flagged, never discounted. */
  npr?: number | null;
  discount_factor?: number | null;
  final_claim_score?: number;
  is_dormant?: boolean;
  weights?: ScoreWeightsDto | null;
  note?: string | null;
  /** New in v1.5 — the ready-made US23 tooltip sentence. */
  formula?: string | null;
}

/**
 * The Truth Sandwich, split into three labelled blocks for a UI that renders
 * sections instead of one paragraph.
 *
 * Omitted entirely for every Synthetic claim (their prebunk is flat) and for
 * older Existing claims generated before the split existed. An individual block
 * can also be `null` — guard for both.
 */
export interface DebunkBlocksDto {
  core_fact?: string | null;
  nuanced_flag?: string | null;
  reiterated_fact?: string | null;
}

/** One audience-segment variant (US12, new in v1.5). */
export interface DebunkSegmentDto {
  segment?: string;
  rationale?: string | null;
  content?: string;
  generated_at?: string | null;
}

export interface ClaimActivityDto {
  type?: string;
  /** Unchanged — still the copy-to-clipboard source. */
  content?: string;
  generated_at?: string | null;
  available?: boolean;
  debunk?: DebunkBlocksDto | null;
  /** Always an array, never `null`; empty on a deployment without segmentation. */
  segments?: DebunkSegmentDto[] | null;
}

/**
 * The US61 cross-link. **Omitted, not null**, when nothing qualifies: the PRD
 * is explicit that there is no empty state. A backend with no detection
 * pipeline deployed behaves identically, which is correct — in both cases
 * there is nothing to show.
 */
export interface ClaimNetworkBadgeDto {
  network_id: string;
  label?: string;
  coordination_score?: number;
  confidence_band?: string;
  /** Displayed, not merely used for filtering — see US61. */
  review_status?: string;
  account_count?: number;
  /** How many other networks also qualify; the highest-scoring one is returned. */
  other_count?: number;
  detail_url?: string;
}

export interface ClaimPolicyRefDto {
  id: string;
  name: string;
  source?: string;
  status?: string | null;
  rolled_out_date?: string | null;
  has_document?: boolean | null;
}

export interface TopAccountDto {
  rank?: number;
  author_id?: string;
  content_count?: number;
  total_impressions?: number;
}

/**
 * `created_at` and `first_caught_at` are DIFFERENT dates and both are sent for
 * an Existing claim: `first_caught_at` is when the AI first detected the claim
 * in the wild (the F1 card's "First caught"), `created_at` is when the row was
 * written. A Synthetic claim carries only `created_at` — its "Predicted" date.
 */
export interface ClaimDto {
  id: string;
  claim_type?: string;
  claim_statement: string;
  topic?: TopicRefDto | null;
  review_status?: string;
  final_claim_score?: number | null;
  is_dormant?: boolean;
  is_on_alert?: boolean;
  positive_statement_count?: number | null;
  negative_statement_count?: number | null;
  created_at?: string | null;
  first_caught_at?: string | null;
  /** Absent unless a qualifying coordinated network exists (US61). */
  coordinated_network?: ClaimNetworkBadgeDto;
}

/** The single overlay row in `cis_claim_reviews` — most recent call only. */
export interface ClaimReviewDto {
  notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export interface ClaimDetailDto extends ClaimDto {
  updated_at?: string | null;
  review?: ClaimReviewDto | null;
  activity?: ClaimActivityDto | null;
  policies?: ClaimPolicyRefDto[] | null;
  score_breakdown?: ScoreBreakdownDto | null;
  top_accounts?: TopAccountDto[] | null;
}

/** Undocumented response shape — read defensively across likely spellings. */
export interface StatementDto {
  id: string;
  content?: string;
  text?: string;
  statement?: string;
  stance?: string;
  sentiment?: string;
  author_id?: string | null;
  author?: string | null;
  posted_at?: string | null;
  created_at?: string | null;
  impressions?: number | null;
  source_url?: string | null;
  url?: string | null;
}

export interface ClaimRepositorySectionDto {
  section?: string;
  claim_type?: string;
  sorted_by?: string;
  total_in_pool?: number;
  claims?: ClaimDto[] | null;
}

export interface ClaimRepositoryDto {
  last_fetched_at?: string | null;
  applied_status?: string;
  applied_topics?: string[] | null;
  existing?: ClaimRepositorySectionDto | null;
  non_existing?: ClaimRepositorySectionDto | null;
}

export interface ScorePointDto {
  bucket_start: string;
  final_claim_score?: number | null;
  claim_score?: number | null;
  sample_count?: number;
}

export interface ScoreHistoryDto {
  claim_id?: string;
  granularity?: string;
  points?: ScorePointDto[] | null;
}

/* ----------------------------- policies ----------------------------- */

export interface PolicyDto {
  id: string;
  name: string;
  description?: string | null;
  month_year?: string | null;
  rolled_out_date?: string | null;
  status?: string;
  file_name?: string | null;
  download_url?: string | null;
  processing_status?: string;
  is_processing?: boolean;
  processing_error?: string | null;
  linked_claim_count?: number | null;
  ai_policy_id?: string | null;
  created_at?: string | null;
  /** Newest `created_at` among linked claims — the value the list sort uses. */
  last_claim_activity_at?: string | null;
}

export interface PolicyDetailDto extends PolicyDto {
  existing_claims?: ClaimDto[] | null;
  non_existing_claims?: ClaimDto[] | null;
}

export interface PolicyProcessingDto {
  policy_id?: string;
  processing_status?: string;
  is_processing?: boolean;
  attempts?: number;
  processed_at?: string | null;
  ai_policy_id?: string | null;
  linked_claim_count?: number | null;
  processing_error?: string | null;
}

export interface PolicyYearsDto {
  years?: number[] | null;
}

/**
 * `GET /policies/:id/file?mode=json`. Under the `local` driver this still
 * returns JSON — `url` is the same `/api/v1/policies/:id/file` path and
 * `is_signed_url` is false, meaning "call it again without mode=json".
 */
export interface PolicyFileUrlDto {
  url?: string | null;
  is_signed_url?: boolean;
  expires_at?: string | null;
}

/* ------------------------------ alerts ------------------------------ */

export interface WatchlistItemDto {
  /** The CLAIM id, per the runbook — not the watchlist row id. */
  id: string;
  alert_id?: string | null;
  claim_statement: string;
  topic?: TopicRefDto | null;
  added_at: string;
  chart_visible?: boolean;
  final_claim_score?: number | null;
  threshold_status?: string;
  threshold?: number | null;
  is_dormant?: boolean;
  /** The claim's own creation date — PRD US29's "Claim Created Date" column.
   *  Not `added_at`, which is when the operator started watching it. */
  claim_created_at?: string | null;
  /** New in v1.5 (US29/US71). Per-reader; only this flag clears on acknowledge. */
  just_crossed?: boolean;
  /** `up` = below -> above, `down` = above -> below. Persists after acknowledge. */
  crossed_direction?: string | null;
  crossed_at?: string | null;
}

/** One entry of `crossings` on `GET /alerts/notifications` (US71). */
export interface ThresholdCrossingDto {
  id: string;
  claim_statement?: string;
  final_claim_score?: number | null;
  threshold_status?: string;
  just_crossed?: boolean;
  crossed_direction?: string | null;
  crossed_at?: string | null;
}

/** `GET /alerts/notifications` and `POST /alerts/notifications/acknowledge`. */
export interface AlertNotificationsDto {
  unacknowledged_count?: number;
  acknowledged_at?: string | null;
  threshold?: number | null;
  crossings?: ThresholdCrossingDto[] | null;
}

export interface AlertSubscriptionDto {
  claim_id?: string;
  on_watchlist?: boolean;
  chart_visible?: boolean;
  added_at?: string | null;
}

export interface AlertChartSeriesDto {
  claim_id: string;
  claim_statement?: string;
  topic?: TopicRefDto | null;
  points?: ScorePointDto[] | null;
}

export interface AlertChartDto {
  granularity?: string;
  threshold?: number | null;
  y_axis_min?: number;
  y_axis_max?: number;
  series?: AlertChartSeriesDto[] | null;
}

/* ----------------------------- settings ----------------------------- */

export interface SettingDto {
  key: string;
  value: string;
  value_type?: string;
  description?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface AlertThresholdDto {
  threshold?: number;
  value?: number | string;
}

/* ------------------------------- admin ------------------------------ */

export interface GeneratedClaimDto {
  claim_id?: string;
  claim_statement?: string;
  topic_id?: string | null;
  last_fetched_at?: string | null;
}

export interface SnapshotResultDto {
  snapshots_captured?: number;
}

export interface RescoreResultDto {
  claims_rescored?: number;
}

/**
 * The three `claims_*` counts and `content_items_clustered` are `null` when
 * `auto_cluster` was false: nothing was clustered, which is different from
 * clustering that produced nothing.
 */
export interface SampleContentResultDto {
  generated_count?: number;
  failed_count?: number;
  claims_created?: number | null;
  claims_updated?: number | null;
  content_items_clustered?: number | null;
  last_fetched_at?: string | null;
  message?: string;
}

export interface ClusterResultDto {
  claims_created?: number;
  claims_updated?: number;
  content_items_clustered?: number;
}

export interface ReconcileResultDto {
  dry_run?: boolean;
  orphaned_reviews?: number;
  orphaned_alerts?: number;
  orphaned_score_snapshots?: number;
  policies_unlinked?: number;
  claims_in_database?: number;
  ai_policies_in_database?: number;
  message?: string;
}

/* ------------------------------ health ------------------------------ */

export interface HealthDto {
  status?: string;
  service?: string;
  environment?: string;
  uptime_seconds?: number;
}

/**
 * `internal_routes_authenticated` was removed in V1. `reachable` is present
 * only when `configured` is true, and `error` only when `reachable` is false.
 *
 * An unreachable AI service does NOT make this endpoint 503 — only a database
 * failure does.
 */
export interface ReadinessDto {
  database?: string;
  storage_driver?: string;
  ai_service?: {
    configured?: boolean;
    reachable?: boolean;
    error?: string;
  } | null;
}
