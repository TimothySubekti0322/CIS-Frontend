"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { queryKeys } from "@/lib/query/keys";

/** Every global setting with its audit metadata. */
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.list,
    queryFn: () => settingsApi.list(),
  });
}

/** The F4 Over/Under cutoff. Defaults to 70 on a fresh database. */
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
    },
  });
}

/**
 * US65 — the F4 city selector's options and current selection.
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
 * Saving a city re-scopes the whole Overview page and moves the timezone F5's
 * report footers are stamped in, so both are invalidated rather than patched:
 * every F6 figure is recomputed server-side against the new scope, and there
 * is nothing the client could correctly recompute on its own.
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
