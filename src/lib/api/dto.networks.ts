/**
 * F5 wire shapes, snake_case, exactly as the CIS backend sends them
 * (`internal/dto/network.go`).
 *
 * Same rule as `dto.ts`: nothing outside `mappers.networks.ts` imports from
 * here. Fields the backend marks `omitempty` are optional and may be absent
 * rather than null.
 */

import type { ClaimPolicyRefDto, TopicRefDto } from "./dto";

/** `any` on the Go side — an opaque bag rendered as key/value rows. */
export type JsonBagDto = Record<string, unknown> | null;

export interface NetworkClaimRefDto {
  claim_id: string;
  claim_statement?: string;
  claim_type?: string;
  topic?: TopicRefDto | null;
  is_primary?: boolean;
  overlap_ratio?: number;
  anchoring_share?: number;
  claim_cluster_post_count?: number;
  passed_relevance_gate?: boolean;
}

export interface PriorAnchorRefDto {
  network_id: string;
  label?: string;
  detected_at?: string;
  confidence_band?: string;
  coordination_score?: number;
  claim_id?: string | null;
  claim_statement?: string | null;
}

export interface RecurrenceInfoDto {
  count?: number;
  first_seen_at?: string | null;
  is_recurrence?: boolean;
  prior_claims?: PriorAnchorRefDto[] | null;
}

export interface RunContextDto {
  run_id: string;
  trigger_source?: string;
  window_start?: string;
  window_end?: string;
  completed_at?: string | null;
  truncated?: boolean;
  candidates_count?: number;
  signals_unavailable?: string[] | null;
  confidence_capped_at_medium?: boolean;
  truncation_note?: string;
}

export interface NetworkCardDto {
  id: string;
  label?: string;
  coordination_score?: number;
  confidence_band?: string;
  signal_breadth?: number;
  review_status?: string;
  account_count?: number;
  post_count?: number;
  platforms?: string[] | null;
  detected_at?: string;
  primary_claim?: NetworkClaimRefDto | null;
  recurrence?: RecurrenceInfoDto | null;
  low_confidence?: boolean;
  from_truncated_run?: boolean;
}

export interface SignalDetailDto {
  code?: string;
  name?: string;
  score?: number;
  method?: string;
  raw_counts?: JsonBagDto;
  weight?: number;
  available?: boolean;
}

export interface ConfidenceExplanationDto {
  band?: string;
  signal_breadth?: number;
  rule?: string;
  capped_by_run?: boolean;
  note?: string;
}

export interface ClaimRelevanceBlockDto {
  primary_claim?: NetworkClaimRefDto | null;
  secondary_claims?: NetworkClaimRefDto[] | null;
  anchor_share_threshold?: number;
  min_claim_posts_threshold?: number;
  min_link_strength_threshold?: number;
}

export interface WhyFlaggedDto {
  coordination_score?: number;
  signals?: SignalDetailDto[] | null;
  confidence?: ConfidenceExplanationDto | null;
  signals_unavailable?: string[] | null;
  internal_density?: number;
  conductance?: number;
  comparison_account_count?: number;
  claim_relevance?: ClaimRelevanceBlockDto | null;
  known_limitations?: string[] | null;
}

export interface ExportEligibilityDto {
  allowed?: boolean;
  reason?: string;
  allowed_statuses?: string[] | null;
}

export interface NetworkReviewDto {
  status?: string;
  reason?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export interface NetworkDetailDto extends NetworkCardDto {
  run?: RunContextDto | null;
  why_flagged?: WhyFlaggedDto | null;
  linked_claims?: NetworkClaimRefDto[] | null;
  linked_policies?: ClaimPolicyRefDto[] | null;
  review?: NetworkReviewDto | null;
  disclaimer?: string;
  export?: ExportEligibilityDto | null;
}

export interface NetworkListDto {
  networks?: NetworkCardDto[] | null;
  status_counts?: Record<string, number> | null;
  low_confidence_shown?: boolean;
  applied_sort?: string;
}

export interface NetworkStatusResponseDto {
  network_id?: string;
  from_status?: string;
  status?: string;
  reason?: string;
  reviewed_at?: string;
  reviewed_by?: string | null;
}

export interface NetworkReviewLogEntryDto {
  id: string;
  from_status?: string;
  to_status?: string;
  reason?: string;
  user_id?: string | null;
  created_at?: string;
  signal_profile?: JsonBagDto;
}

/* --------------------------------- graph -------------------------------- */

export interface EdgeSignalsDto {
  w_time?: number;
  w_text?: number;
  w_amp?: number;
  w_meta?: number;
  w_struct?: number;
}

export interface GraphNodeDto {
  account_id: string;
  handle?: string;
  platform?: string;
  role?: string;
  degree_centrality?: number;
  eigenvector_centrality?: number;
  posts_in_cluster?: number;
  x?: number | null;
  y?: number | null;
  allowlisted?: boolean;
}

export interface GraphEdgeDto {
  source: string;
  target: string;
  weight?: number;
  signals?: EdgeSignalsDto | null;
  signal_count?: number;
}

export interface NetworkGraphDto {
  nodes?: GraphNodeDto[] | null;
  edges?: GraphEdgeDto[] | null;
  reduced?: boolean;
  reduction_note?: string;
  total_node_count?: number;
  member_count?: number;
  comparison_count?: number;
}

/* ------------------------------- timeline ------------------------------- */

export interface BurstBinDto {
  bin_start: string;
  post_count?: number;
  zscore?: number;
  is_anomalous?: boolean;
}

export interface BurstTimelineDto {
  bin_width_seconds?: number;
  window_start?: string;
  window_end?: string;
  bins?: BurstBinDto[] | null;
  anomalous_count?: number;
}

/* ------------------------------- evidence ------------------------------- */

export interface EvidencePostDto {
  id: string;
  account_id?: string;
  handle?: string;
  platform?: string;
  post_platform_id?: string;
  text?: string;
  posted_at?: string;
  captured_at?: string;
  content_sha256?: string;
  is_canonical?: boolean;
  still_public?: boolean;
  availability?: string;
  shared_span_start?: number | null;
  shared_span_end?: number | null;
}

export interface DuplicateGroupDto {
  group_id: string;
  canonical_text?: string;
  variant_count?: number;
  variants?: EvidencePostDto[] | null;
}

export interface RepresentativeContentDto {
  groups?: DuplicateGroupDto[] | null;
  ungrouped?: EvidencePostDto[] | null;
  note?: string;
}

/* ---------------------------- account annex ----------------------------- */

export interface AccountAnnexRowDto {
  account_id: string;
  handle?: string;
  platform?: string;
  platform_account_id?: string;
  created_at_platform?: string | null;
  posts_in_cluster?: number;
  duplication_rate?: number;
  median_interpost_interval_seconds?: number | null;
  circadian_coverage?: number;
  degree_centrality?: number;
  eigenvector_centrality?: number;
  score_contribution?: JsonBagDto;
  role?: string;
  allowlisted?: boolean;
}

export interface AccountDrawerDto {
  account?: AccountAnnexRowDto | null;
  posts?: EvidencePostDto[] | null;
  connecting_edges?: GraphEdgeDto[] | null;
  explanation?: string;
}

/* -------------------------------- reports ------------------------------- */

export interface ReportSectionsDto {
  graph?: boolean;
  content_clusters?: boolean;
  account_annex?: boolean;
  methodology?: boolean;
}

export interface ReportViewDto {
  id: string;
  network_id?: string;
  run_id?: string;
  report_type?: string;
  file_name?: string;
  file_sha256?: string;
  file_size_bytes?: number;
  sections?: ReportSectionsDto | null;
  redact_analyst_names?: boolean;
  snapshot_id?: string | null;
  snapshot_sha256?: string | null;
  audit_id?: string | null;
  generated_by?: string | null;
  generated_at?: string;
  download_url?: string;
}

/* ------------------------------ allowlist ------------------------------- */

export interface AllowlistEntryDto {
  id: string;
  platform?: string;
  platform_account_id?: string;
  handle?: string;
  category?: string;
  reason?: string;
  added_by?: string | null;
  added_at?: string;
  removed_by?: string | null;
  removed_at?: string | null;
  removal_reason?: string | null;
  active?: boolean;
}

export interface AllowlistActionResultDto {
  accounts_added?: number;
  networks_affected?: number;
  handles?: string[] | null;
  exported_reports_affected?: string[] | null;
  note?: string;
}

export interface CommonPhraseDto {
  id: string;
  phrase?: string;
  category?: string;
  notes?: string | null;
  created_at?: string;
}

/* ---------------------------- detection runs ---------------------------- */

export interface DetectionRunDto {
  run_id: string;
  status?: string;
  trigger_source?: string;
  scope_claim_ids?: string[] | null;
  window_start?: string;
  window_end?: string;
  truncated?: boolean;
  candidates_count?: number;
  signals_unavailable?: string[] | null;
  confidence_capped_at_medium?: boolean;
  network_count?: number;
  offtopic_count?: number;
  random_seed?: number | null;
  started_at?: string;
  completed_at?: string | null;
  error?: string | null;
  parameters?: JsonBagDto;
}

export interface TriggerDetectionResponseDto {
  run_id?: string | null;
  status?: string;
  claim_ids?: string[] | null;
  message?: string;
}

/* ------------------------------ governance ------------------------------ */

export interface OfftopicClusterDto {
  cluster_id: string;
  run_id?: string;
  claim_id?: string;
  claim_statement?: string | null;
  failed_test?: string;
  overlap_ratio?: number;
  anchoring_share?: number;
  account_count?: number;
  post_count?: number;
  signals?: JsonBagDto;
  created_at?: string;
}

export interface OfftopicRateDto {
  run_id: string;
  started_at?: string;
  surfaced_count?: number;
  offtopic_count?: number;
  rate?: number;
  failed_tests?: string[] | null;
}

export interface DismissalDto {
  id: string;
  network_id?: string;
  network_label?: string | null;
  reason?: string;
  user_id?: string | null;
  created_at?: string;
  signal_profile?: JsonBagDto;
}

export interface DismissalSummaryDto {
  window_days?: number;
  confirmed?: number;
  action_taken?: number;
  dismissed?: number;
  precision?: number | null;
  precision_target?: number;
  meets_target?: boolean | null;
  mean_signal_scores?: Record<string, number> | null;
  sample_size?: number;
  note?: string;
}

export interface AuditLogEntryDto {
  id: string;
  object_type?: string;
  object_id?: string;
  network_id?: string;
  run_id?: string | null;
  export_type?: string;
  user_id?: string | null;
  user_name?: string | null;
  settings?: JsonBagDto;
  created_at?: string;
}

/* --------------------------- detector settings -------------------------- */

export interface DetectorSettingsDto {
  window_days?: number;
  bin_width_seconds?: number;
  null_model_alpha?: number;
  dup_threshold?: number;
  sem_threshold?: number;
  min_post_length?: number;
  edge_threshold?: number;
  min_signal_families?: number;
  k_core?: number;
  leiden_resolution?: number;
  min_cluster_size?: number;
  min_internal_density?: number;
  beta_time?: number;
  beta_text?: number;
  beta_amp?: number;
  beta_meta?: number;
  beta_struct?: number;
  provenance_half_life_hours?: number;
  anchor_share?: number;
  min_claim_posts?: number;
  min_link_strength?: number;
  high_score_cutoff?: number;
  high_breadth_cutoff?: number;
  medium_score_cutoff?: number;
  medium_breadth_cutoff?: number;
  cadence_hours?: number;
  candidate_cap?: number;
  recurrence_threshold?: number;
  velocity_trigger_threshold?: number;
  velocity_trigger_enabled?: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
  self_exclusion_count?: number;
}

export interface DetectorParamRangeDto {
  key: string;
  label?: string;
  symbol?: string;
  min?: number;
  max?: number;
  default?: number;
  unit?: string;
  integer?: boolean;
  note?: string;
}

export interface SettingHistoryEntryDto {
  id: string;
  key?: string;
  from_value?: string | null;
  to_value?: string;
  changed_by?: string | null;
  created_at?: string;
}

/* --------------------------- city timezone ------------------------------ */

export interface CityTimezoneDto {
  timezone?: string;
  updated_at?: string | null;
  updated_by?: string | null;
}
