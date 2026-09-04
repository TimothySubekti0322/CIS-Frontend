/**
 * Overview dashboard wire shapes, snake_case exactly as `docs/api/overview.md`
 * documents them. Nothing outside `mappers.overview.ts` imports this file.
 */

import type { TopicRefDto } from "./dto";

export interface CityDto {
  name?: string;
  province?: string | null;
  timezone?: string | null;
}

export interface CityOptionsDto {
  cities?: CityDto[] | null;
  selected?: CityDto | null;
}

export interface OverviewCityDto extends CityDto {
  /** `false` — the selection labels this instance rather than filtering it. */
  partitioned?: boolean;
}

export interface ThresholdRatioDto {
  above?: number;
  below?: number;
  total?: number;
  above_percent?: number;
  threshold?: number | null;
}

export interface SentimentVolumeDto {
  total?: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

/** `score` is `null` unless `status` is `ok`; `reason` is display-ready. */
export interface SentimentDto {
  status?: string;
  score?: number | null;
  band?: string | null;
  reason?: string | null;
  bcs?: number | null;
  bcs_normalized?: number | null;
  risk_load?: number | null;
  momentum?: number | null;
  momentum_direction?: string | null;
  volume?: SentimentVolumeDto | null;
  window_start?: string | null;
  window_end?: string | null;
  window_days?: number | null;
  minimum_volume?: number | null;
  risk_threshold?: number | null;
  weight_bcs?: number | null;
  weight_risk_load?: number | null;
}

export interface OverviewTopicDto {
  topic?: TopicRefDto | null;
  claim_count?: number;
  above_threshold_count?: number;
  average_score?: number | null;
  box_size?: number;
}

export interface OverviewPolicyRefDto {
  id: string;
  name?: string;
  source?: string;
  ai_policy_id?: string | null;
  status?: string | null;
  rolled_out_date?: string | null;
  has_document?: boolean | null;
}

export interface OverviewPolicyDto {
  rank?: number;
  policy?: OverviewPolicyRefDto | null;
  claim_count?: number;
  above_threshold_count?: number;
  average_score?: number | null;
  score?: number;
}

export interface OverviewDto {
  city?: OverviewCityDto | null;
  generated_at?: string | null;
  threshold_ratio?: ThresholdRatioDto | null;
  sentiment?: SentimentDto | null;
  topics?: OverviewTopicDto[] | null;
  policies?: OverviewPolicyDto[] | null;
}

export interface TopicOverviewDto {
  topic?: TopicRefDto | null;
  claim_count?: number;
  above_threshold_count?: number;
  below_threshold_count?: number;
  /** `null` when nothing is below threshold — print nothing, not "Infinity". */
  above_under_ratio?: number | null;
  average_score?: number | null;
  average_score_mom_percent?: number | null;
  mom_direction?: string | null;
  current_month_average?: number | null;
  previous_month_average?: number | null;
  threshold?: number | null;
}
