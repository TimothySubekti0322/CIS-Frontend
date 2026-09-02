/**
 * Wire shapes for `GET|PUT /settings/parameters` — `internal/dto/config.go`.
 *
 * `ConfigParamViewDto` flattens the registry row and its current value into one
 * object, exactly as the backend embeds `models.ConfigParam` in the view.
 */

export interface ConfigTierDto {
  key: string;
  title?: string;
  description?: string;
}

export interface ConfigParamViewDto {
  key: string;
  label?: string;
  tier?: string;
  section?: string;
  type?: string;
  default?: string;
  min?: number;
  max?: number;
  unit?: string;
  owner?: string;
  sum_group?: string;
  derived?: boolean;
  managed_by?: string;
  prd_ref?: string;
  param_id?: string;
  description?: string;
  note?: string;
  value?: string;
  is_set?: boolean;
  writable?: boolean;
}

export interface ConfigSectionViewDto {
  key: string;
  tier?: string;
  title?: string;
  description?: string;
  parameters?: ConfigParamViewDto[] | null;
}

export interface ConfigCatalogDto {
  tiers?: ConfigTierDto[] | null;
  sections?: ConfigSectionViewDto[] | null;
  generated_at?: string;
}
