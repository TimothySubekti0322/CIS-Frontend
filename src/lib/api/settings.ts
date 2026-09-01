import type { Setting } from "@/types/alert";
import type { City, CityOptions } from "@/types/overview";
import { apiClient } from "./client";
import type { AlertThresholdDto, SettingDto } from "./dto";
import type { CityDto, CityOptionsDto } from "./dto.overview";
import { ENDPOINTS } from "./endpoints";
import { mapSetting, mapThreshold } from "./mappers";
import { mapCity, mapCityOptions } from "./mappers.overview";

/** Key of the global Over/Under cutoff inside `GET /settings`. */
export const ALERT_THRESHOLD_KEY = "alert_threshold";

/** Key of the "last fetched" timestamp shown on the F1 Existing section. */
export const CLAIMS_LAST_FETCHED_KEY = "claims_last_fetched_at";

export const settingsApi = {
  /** `GET /settings` — every global setting with its audit metadata. */
  async list(): Promise<Setting[]> {
    const dto = await apiClient.call<SettingDto[]>(ENDPOINTS.settings.list);
    return (dto ?? []).map(mapSetting);
  },

  /**
   * `GET /settings/alert-threshold` — defaults to 70 on a fresh database, so
   * F3 never breaks before an admin has saved anything.
   */
  async getAlertThreshold(): Promise<number> {
    const dto = await apiClient.call<AlertThresholdDto | number>(
      ENDPOINTS.settings.getAlertThreshold,
    );
    return mapThreshold(dto);
  },

  /**
   * `PUT /settings/alert-threshold` — applies globally, effective immediately.
   * Every claim's `threshold_status` on F3 is derived at read time, so
   * lowering 70 to 60 instantly reclassifies a claim scoring 68.9.
   */
  async setAlertThreshold(threshold: number): Promise<number> {
    const dto = await apiClient.call<AlertThresholdDto | number>(
      ENDPOINTS.settings.updateAlertThreshold,
      { body: { threshold } },
    );
    return mapThreshold(dto, threshold);
  },

  /**
   * `GET /settings/cities` (US65) — the dropdown's options and the current
   * selection in one call, so the form never has to reconcile two responses.
   */
  async cities(): Promise<CityOptions> {
    const dto = await apiClient.call<CityOptionsDto>(ENDPOINTS.settings.cities);
    return mapCityOptions(dto);
  },

  /** `GET /settings/city` — the current selection alone. */
  async getCity(): Promise<City | null> {
    const dto = await apiClient.call<CityDto>(ENDPOINTS.settings.getCity);
    return mapCity(dto);
  },

  /**
   * `PUT /settings/city` — single-select; the new city replaces the old
   * outright and writes `city_timezone` with it, so F5's report footers and
   * F6's scope cannot disagree. Changing it re-scopes the Overview page, so
   * the caller must refetch `GET /overview`. `422` for a city outside the list.
   */
  async setCity(city: string): Promise<City | null> {
    const dto = await apiClient.call<CityDto>(ENDPOINTS.settings.setCity, {
      body: { city },
    });
    return mapCity(dto);
  },
};
