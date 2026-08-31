import type { Paginated } from "@/types/common";
import type {
  AllowlistEntry,
  AllowlistParams,
  AuditLogEntry,
  AuditLogParams,
  CommonPhrase,
  CreateAllowlistEntryPayload,
  DetectionRun,
  DetectionRunListParams,
  DetectorParamRange,
  DetectorSettings,
  Dismissal,
  DismissalSummary,
  OfftopicCluster,
  OfftopicClusterParams,
  OfftopicRate,
  SettingHistoryEntry,
  TriggerDetectionResult,
} from "@/types/network";
import { apiClient } from "./client";
import type {
  AllowlistEntryDto,
  AuditLogEntryDto,
  CityTimezoneDto,
  CommonPhraseDto,
  DetectionRunDto,
  DetectorParamRangeDto,
  DetectorSettingsDto,
  DismissalDto,
  DismissalSummaryDto,
  OfftopicClusterDto,
  OfftopicRateDto,
  SettingHistoryEntryDto,
  TriggerDetectionResponseDto,
} from "./dto.networks";
import { ENDPOINTS } from "./endpoints";
import { mapMeta } from "./mappers";
import {
  mapAllowlistEntry,
  mapAuditLogEntry,
  mapCommonPhrase,
  mapDetectionRun,
  mapDetectorSettings,
  mapDismissal,
  mapDismissalSummary,
  mapOfftopicCluster,
  mapOfftopicRate,
  mapParamRange,
  mapSettingHistory,
  mapTriggerResult,
} from "./mappers.networks";

/* ------------------------- detection runs (US62) ------------------------ */

/**
 * Run history is deliberately NOT under `/admin`: truncation and unavailable
 * signal families explain why a network is banded where it is. "Why is
 * everything Medium this week?" is an analyst's question about runs.
 */
export const detectionApi = {
  async listRuns(
    params: DetectionRunListParams = {},
  ): Promise<Paginated<DetectionRun>> {
    const { data, meta } = await apiClient.callWithMeta<DetectionRunDto[]>(
      ENDPOINTS.detectionRuns.list,
      {
        query: {
          status: params.status,
          trigger: params.trigger,
          truncated: params.truncated,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapDetectionRun);
    return { items, meta: mapMeta(meta, items.length) };
  },

  async run(id: string): Promise<DetectionRun> {
    const dto = await apiClient.call<DetectionRunDto>(ENDPOINTS.detectionRuns.get, {
      params: { id },
    });
    return mapDetectionRun(dto);
  },

  /**
   * `POST /admin/detection-runs` — an on-demand run over one or more claims.
   * A Synthetic claim is rejected with 422: it has no real posts, so there is
   * nothing to cluster.
   */
  async trigger(claimIds: string[]): Promise<TriggerDetectionResult> {
    const dto = await apiClient.call<TriggerDetectionResponseDto>(
      ENDPOINTS.admin.triggerDetection,
      { body: { claim_ids: claimIds } },
    );
    return mapTriggerResult(dto ?? {});
  },

  /**
   * `GET /admin/offtopic-clusters` — genuinely coordinated clusters that failed
   * the claim-relevance gate: spam rings, engagement farms, unrelated political
   * amplification. They are not the city's problem and must never appear in a
   * climate report; they are retained only so an admin can see whether the gate
   * is set too loose or too tight.
   */
  async offtopicClusters(
    params: OfftopicClusterParams = {},
  ): Promise<Paginated<OfftopicCluster>> {
    const { data, meta } = await apiClient.callWithMeta<OfftopicClusterDto[]>(
      ENDPOINTS.admin.offtopicClusters,
      {
        query: {
          run_id: params.runId,
          claim_id: params.claimId,
          failed_test: params.failedTest,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapOfftopicCluster);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /** The off-topic rate per run — the trend that answers the threshold question. */
  async offtopicRates(limit = 30): Promise<OfftopicRate[]> {
    const dto = await apiClient.call<OfftopicRateDto[]>(
      ENDPOINTS.admin.offtopicRates,
      { query: { limit } },
    );
    return (dto ?? []).map(mapOfftopicRate);
  },

  /** Every false-positive dismissal with its reason and its signal profile. */
  async dismissals(
    params: { from?: string; to?: string; page?: number; limit?: number } = {},
  ): Promise<Paginated<Dismissal>> {
    const { data, meta } = await apiClient.callWithMeta<DismissalDto[]>(
      ENDPOINTS.admin.dismissals,
      {
        query: {
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapDismissal);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /**
   * The aggregate (PRD 10.9.3): dismissal rate, precision against the PRD's
   * target, and which signals over-trigger. Whether dismissals should
   * auto-adjust the weights is an open question and the current answer is no —
   * these endpoints report, an admin decides.
   */
  async dismissalSummary(windowDays = 90): Promise<DismissalSummary> {
    const dto = await apiClient.call<DismissalSummaryDto>(
      ENDPOINTS.admin.dismissalSummary,
      { query: { window_days: windowDays } },
    );
    return mapDismissalSummary(dto ?? {});
  },

  /** `GET /admin/export-audit` — US64. Who exported what, when, and how. */
  async exportAudit(params: AuditLogParams = {}): Promise<Paginated<AuditLogEntry>> {
    const { data, meta } = await apiClient.callWithMeta<AuditLogEntryDto[]>(
      ENDPOINTS.admin.exportAudit,
      {
        query: {
          user_id: params.userId,
          network_id: params.networkId,
          run_id: params.runId,
          export_type: params.exportType,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapAuditLogEntry);
    return { items, meta: mapMeta(meta, items.length) };
  },
};

/* --------------------- the declared-coordination allowlist -------------- */

/**
 * Accounts the team has **declared** as legitimately coordinating (US56, US63).
 *
 * Entries are keyed on `(platform, platform_account_id)`, not on the handle:
 * handles get renamed, the platform-issued id does not, and protection keyed on
 * the handle alone would lapse the moment an NGO rebranded.
 */
export const allowlistApi = {
  async list(params: AllowlistParams = {}): Promise<Paginated<AllowlistEntry>> {
    const { data, meta } = await apiClient.callWithMeta<AllowlistEntryDto[]>(
      ENDPOINTS.admin.allowlist,
      {
        query: {
          q: params.q,
          platform: params.platform,
          category: params.category,
          include_removed: params.includeRemoved,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapAllowlistEntry);
    return { items, meta: mapMeta(meta, items.length) };
  },

  async categories(): Promise<Record<string, number>> {
    const dto = await apiClient.call<Record<string, number>>(
      ENDPOINTS.admin.allowlistCategories,
    );
    return dto ?? {};
  },

  async create(payload: CreateAllowlistEntryPayload): Promise<AllowlistEntry> {
    const dto = await apiClient.call<AllowlistEntryDto>(
      ENDPOINTS.admin.createAllowlistEntry,
      {
        body: {
          platform: payload.platform,
          platform_account_id: payload.platformAccountId,
          handle: payload.handle,
          category: payload.category,
          reason: payload.reason,
        },
      },
    );
    return mapAllowlistEntry(dto);
  },

  async update(
    id: string,
    payload: { category?: string; reason?: string },
  ): Promise<AllowlistEntry> {
    const dto = await apiClient.call<AllowlistEntryDto>(
      ENDPOINTS.admin.updateAllowlistEntry,
      { params: { id }, body: { category: payload.category, reason: payload.reason } },
    );
    return mapAllowlistEntry(dto);
  },

  /**
   * Removal requires its own reason, stored separately from the addition
   * reason — overwriting the latter would destroy the record of why the entry
   * existed in the first place.
   */
  async remove(id: string, reason: string): Promise<AllowlistEntry> {
    const dto = await apiClient.call<AllowlistEntryDto>(
      ENDPOINTS.admin.removeAllowlistEntry,
      { params: { id }, body: { reason } },
    );
    return mapAllowlistEntry(dto);
  },

  /**
   * The phrase allowlist: slogans and civic boilerplate excluded from
   * duplication scoring, so a shared campaign hashtag is not read as content
   * duplication (PRD 10.5.2.2).
   */
  async phrases(
    params: { q?: string; page?: number; limit?: number } = {},
  ): Promise<Paginated<CommonPhrase>> {
    const { data, meta } = await apiClient.callWithMeta<CommonPhraseDto[]>(
      ENDPOINTS.admin.commonPhrases,
      { query: { q: params.q, page: params.page, limit: params.limit } },
    );
    const items = (data ?? []).map(mapCommonPhrase);
    return { items, meta: mapMeta(meta, items.length) };
  },

  async createPhrase(payload: {
    phrase: string;
    category: string;
    notes?: string;
  }): Promise<CommonPhrase> {
    const dto = await apiClient.call<CommonPhraseDto>(
      ENDPOINTS.admin.createCommonPhrase,
      {
        body: {
          phrase: payload.phrase,
          category: payload.category,
          notes: payload.notes,
        },
      },
    );
    return mapCommonPhrase(dto);
  },

  async deletePhrase(id: string): Promise<void> {
    await apiClient.call<unknown>(ENDPOINTS.admin.deleteCommonPhrase, {
      params: { id },
    });
  },
};

/* -------------------------- detector settings (US62) -------------------- */

/**
 * ~30 governed parameters with two cross-field constraints — the weights must
 * sum to 1.00 and the run cadence may not exceed W/2 — which is why they do not
 * live in the flat `cis_settings` store.
 */
export const detectorSettingsApi = {
  async get(): Promise<DetectorSettings> {
    const dto = await apiClient.call<DetectorSettingsDto>(
      ENDPOINTS.settings.getDetector,
    );
    return mapDetectorSettings(dto ?? {});
  },

  /**
   * Every field is optional and only changed values are sent: a screen that
   * saves one threshold must not silently reset the other twenty-nine to
   * whatever its form defaulted to. Validation is whole-row, so a change that
   * invalidates a *stored* sibling is rejected — which is the point.
   */
  async update(patch: Record<string, number | boolean>): Promise<DetectorSettings> {
    const dto = await apiClient.call<DetectorSettingsDto>(
      ENDPOINTS.settings.updateDetector,
      { body: patch },
    );
    return mapDetectorSettings(dto ?? {});
  },

  /**
   * PRD 10.11's Default Parameter Reference. Serve the form from this rather
   * than hard-coding bounds, so the client and the server cannot disagree about
   * what is legal.
   */
  async ranges(): Promise<DetectorParamRange[]> {
    const dto = await apiClient.call<DetectorParamRangeDto[]>(
      ENDPOINTS.settings.detectorRanges,
    );
    return (dto ?? []).map(mapParamRange);
  },

  async history(limit = 100): Promise<SettingHistoryEntry[]> {
    const dto = await apiClient.call<SettingHistoryEntryDto[]>(
      ENDPOINTS.settings.detectorHistory,
      { query: { limit } },
    );
    return (dto ?? []).map(mapSettingHistory);
  },

  /**
   * PRD 10.8 requires every report footer to carry the generation time in UTC
   * and city-local time, and nothing else in the system knows which city. An
   * invalid zone is rejected with 422 rather than silently falling back to UTC.
   */
  async getCityTimezone(): Promise<string> {
    const dto = await apiClient.call<CityTimezoneDto | string>(
      ENDPOINTS.settings.getCityTimezone,
    );
    if (typeof dto === "string") return dto;
    return dto?.timezone ?? "UTC";
  },

  async setCityTimezone(timezone: string): Promise<string> {
    const dto = await apiClient.call<CityTimezoneDto | string>(
      ENDPOINTS.settings.setCityTimezone,
      { body: { timezone } },
    );
    if (typeof dto === "string") return dto;
    return dto?.timezone ?? timezone;
  },
};
