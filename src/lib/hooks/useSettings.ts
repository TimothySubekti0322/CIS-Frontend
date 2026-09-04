"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ParameterCatalog, ParameterPatch } from "@/types/settings";
import { settingsApi } from "@/lib/api/settings";
import { PARAM, parseValue } from "@/lib/parameters";
import { queryKeys } from "@/lib/query/keys";

/** Every global setting with its audit metadata. */
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.list,
    queryFn: () => settingsApi.list(),
  });
}

/**
 * The dynamic-parameter catalog: every bound, unit, default and grouping
 * the form renders from, alongside each parameter's current value.
 */
export function useParameters() {
  return useQuery({
    queryKey: queryKeys.settings.parameters,
    queryFn: () => settingsApi.parameters(),
  });
}

/**
 * A parameter's current value, for a screen that consumes one rather than
 * edits it — the policy upload warning, for instance. Served from the same
 * cached catalog the admin form uses, so no screen holds its own copy.
 */
export function useParameterValue(key: string): number | null {
  const { data } = useParameters();
  for (const section of data?.sections ?? []) {
    const param = section.parameters.find((p) => p.key === key);
    if (param) return parseValue(param.value);
  }
  return null;
}

/**
 * The size above which the Add Public Policy modal warns. A warning,
 * never a block: the backend enforces no upload limit, and this only flags an
 * unusually large file before the uploader waits on it.
 */
export function usePolicyUploadWarnMb(): number | null {
  return useParameterValue(PARAM.policyUploadWarnMb);
}

/**
 * A partial write. The response is the whole refreshed catalog, so it is
 * written straight into the cache rather than triggering a refetch.
 *
 * Everything downstream is invalidated because these values decide what a
 * score means: the alert threshold reclassifies every watched claim at read
 * time, the weights move every Overview aggregate, and the CSI bands recolour
 * the gauge. None of it is recomputable on the client.
 */
function applyCatalog(qc: ReturnType<typeof useQueryClient>, catalog: ParameterCatalog) {
  qc.setQueryData(queryKeys.settings.parameters, catalog);
  // Deliberately not `settings.all`: that prefix covers the catalog itself,
  // and invalidating it would throw away the response just written and refetch
  // what the server already sent back.
  qc.invalidateQueries({ queryKey: queryKeys.settings.list });
  qc.invalidateQueries({ queryKey: queryKeys.settings.alertThreshold });
  qc.invalidateQueries({ queryKey: ["settings", "history"] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
  qc.invalidateQueries({ queryKey: queryKeys.overview.all });
  qc.invalidateQueries({ queryKey: queryKeys.claims.all });
}

export function useUpdateParameters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ParameterPatch) => settingsApi.updateParameters(patch),
    onSuccess: (catalog) => applyCatalog(qc, catalog),
  });
}

/** Back to the documented default. Idempotent, and recorded in the history. */
export function useResetParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => settingsApi.resetParameter(key),
    onSuccess: (catalog) => applyCatalog(qc, catalog),
  });
}

/** Who changed what, when, across the whole settings surface. */
export function useSettingHistory(params: { key?: string; page?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.settings.history(params),
    queryFn: () => settingsApi.history({ ...params, limit: 20 }),
  });
}

/** The Over/Under cutoff. Defaults to 70 on a fresh database. */
export function useAlertThreshold() {
  return useQuery({
    queryKey: queryKeys.settings.alertThreshold,
    queryFn: () => settingsApi.getAlertThreshold(),
  });
}

export function useUpdateAlertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threshold: number) => settingsApi.setAlertThreshold(threshold),
    onSuccess: (threshold) => {
      qc.setQueryData(queryKeys.settings.alertThreshold, threshold);
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
      // `threshold_status` is derived at read time — refetch, don't recompute.
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
      // The Overview counts above/below against the same cutoff, and the CSI
      // risk threshold is derived from it — both move the moment this does.
      qc.invalidateQueries({ queryKey: queryKeys.overview.all });
    },
  });
}

/**
 * The city selector's options and current selection.
 *
 * The catalog is a closed set held in backend code, so it changes on a human
 * timescale rather than a request one; it is cached accordingly.
 */
export function useCities() {
  return useQuery({
    queryKey: queryKeys.settings.cities,
    queryFn: () => settingsApi.cities(),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Saving a city re-scopes the whole Overview page and moves the timezone
 * report footers are stamped in, so both are invalidated rather than patched:
 * every aggregate figure is recomputed server-side against the new scope, and
 * there is nothing the client could correctly recompute on its own.
 */
export function useUpdateCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (city: string) => settingsApi.setCity(city),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
      qc.invalidateQueries({ queryKey: queryKeys.overview.all });
    },
  });
}
