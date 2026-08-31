"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AllowlistParams,
  AuditLogParams,
  CreateAllowlistEntryPayload,
  DetectionRunListParams,
  OfftopicClusterParams,
} from "@/types/network";
import { allowlistApi, detectionApi, detectorSettingsApi } from "@/lib/api/detector";
import { queryKeys } from "@/lib/query/keys";

/* --------------------------- detector settings -------------------------- */

export function useDetectorSettings() {
  return useQuery({
    queryKey: queryKeys.settings.detector,
    queryFn: () => detectorSettingsApi.get(),
  });
}

/**
 * PRD 10.11's bounds. These change only on a deploy, so they are cached hard —
 * the form is served from them rather than from hardcoded constants, so the
 * client and the server cannot disagree about what is legal.
 */
export function useDetectorRanges() {
  return useQuery({
    queryKey: queryKeys.settings.detectorRanges,
    queryFn: () => detectorSettingsApi.ranges(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useDetectorHistory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.detectorHistory,
    queryFn: () => detectorSettingsApi.history(),
    enabled,
  });
}

/** Only changed keys are sent — an omitted parameter keeps its stored value. */
export function useUpdateDetectorSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, number | boolean>) =>
      detectorSettingsApi.update(patch),
    onSuccess: (settings) => {
      qc.setQueryData(queryKeys.settings.detector, settings);
      qc.invalidateQueries({ queryKey: queryKeys.settings.detectorHistory });
    },
  });
}

export function useCityTimezone() {
  return useQuery({
    queryKey: queryKeys.settings.cityTimezone,
    queryFn: () => detectorSettingsApi.getCityTimezone(),
  });
}

export function useSetCityTimezone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (timezone: string) => detectorSettingsApi.setCityTimezone(timezone),
    onSuccess: (tz) => qc.setQueryData(queryKeys.settings.cityTimezone, tz),
  });
}

/* ----------------------------- detection runs --------------------------- */

export function useDetectionRuns(params?: DetectionRunListParams) {
  return useQuery({
    queryKey: queryKeys.detection.runs(params),
    queryFn: () => detectionApi.listRuns(params),
  });
}

export function useDetectionRun(id: string) {
  return useQuery({
    queryKey: queryKeys.detection.run(id),
    queryFn: () => detectionApi.run(id),
    enabled: Boolean(id),
  });
}

/** On-demand run. 422 for a Synthetic claim — it has no real posts. */
export function useTriggerDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimIds: string[]) => detectionApi.trigger(claimIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.detection.all });
      qc.invalidateQueries({ queryKey: queryKeys.networks.all });
    },
  });
}

/* ------------------------------ governance ------------------------------ */

export function useOfftopicClusters(params?: OfftopicClusterParams) {
  return useQuery({
    queryKey: queryKeys.detection.offtopic(params),
    queryFn: () => detectionApi.offtopicClusters(params),
  });
}

export function useOfftopicRates() {
  return useQuery({
    queryKey: queryKeys.detection.offtopicRates,
    queryFn: () => detectionApi.offtopicRates(),
  });
}

export function useDismissals(params?: { from?: string; to?: string; page?: number }) {
  return useQuery({
    queryKey: queryKeys.detection.dismissals(params),
    queryFn: () => detectionApi.dismissals(params),
  });
}

export function useDismissalSummary(windowDays = 90) {
  return useQuery({
    queryKey: queryKeys.detection.dismissalSummary(windowDays),
    queryFn: () => detectionApi.dismissalSummary(windowDays),
  });
}

export function useExportAudit(params?: AuditLogParams) {
  return useQuery({
    queryKey: queryKeys.detection.exportAudit(params),
    queryFn: () => detectionApi.exportAudit(params),
  });
}

/* ------------------------------- allowlist ------------------------------ */

export function useAllowlist(params?: AllowlistParams) {
  return useQuery({
    queryKey: queryKeys.allowlist.list(params),
    queryFn: () => allowlistApi.list(params),
  });
}

export function useAllowlistCategories() {
  return useQuery({
    queryKey: queryKeys.allowlist.categories,
    queryFn: () => allowlistApi.categories(),
  });
}

/**
 * Adding an entry is retroactive on the detector side, so the network list and
 * F1's badges are invalidated alongside the allowlist itself.
 */
export function useCreateAllowlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAllowlistEntryPayload) => allowlistApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.allowlist.all });
      qc.invalidateQueries({ queryKey: queryKeys.networks.all });
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
}

export function useUpdateAllowlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      category?: string;
      reason?: string;
    }) => allowlistApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.allowlist.all }),
  });
}

/**
 * Removal is what lets the detector flag an organisation again, so its reason
 * is required and stored separately from the addition reason.
 */
export function useRemoveAllowlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      allowlistApi.remove(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.allowlist.all });
      qc.invalidateQueries({ queryKey: queryKeys.networks.all });
    },
  });
}

export function useCommonPhrases(params?: { q?: string; page?: number }) {
  return useQuery({
    queryKey: queryKeys.allowlist.phrases(params),
    queryFn: () => allowlistApi.phrases(params),
  });
}

export function useCreateCommonPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { phrase: string; category: string; notes?: string }) =>
      allowlistApi.createPhrase(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.allowlist.all }),
  });
}

export function useDeleteCommonPhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => allowlistApi.deletePhrase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.allowlist.all }),
  });
}
