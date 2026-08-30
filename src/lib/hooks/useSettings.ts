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
