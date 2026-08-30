"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AlertChartParams, WatchlistParams } from "@/types/alert";
import { alertsApi } from "@/lib/api/alerts";
import { queryKeys } from "@/lib/query/keys";

export function useWatchlist(params?: WatchlistParams) {
  return useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => alertsApi.list(params),
  });
}

/** Chart + legend for the ticked claims. `series: []` is the empty state. */
export function useAlertChart(params?: AlertChartParams) {
  return useQuery({
    queryKey: queryKeys.alerts.chart(params),
    queryFn: () => alertsApi.chart(params),
  });
}

/**
 * The F1/F2 bell icon. Adding an already-watched claim is a no-op server-side,
 * so a double-click cannot desynchronise the bell.
 */
export function useToggleWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ claimId, add }: { claimId: string; add: boolean }) => {
      if (add) await alertsApi.add(claimId);
      else await alertsApi.remove(claimId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
      // `is_on_alert` is embedded in claim and policy payloads.
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}

/** The watchlist table's "Chart" checkbox — persisted, not local UI state. */
export function useSetChartVisible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, visible }: { claimId: string; visible: boolean }) =>
      alertsApi.setChartVisible(claimId, visible),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}
