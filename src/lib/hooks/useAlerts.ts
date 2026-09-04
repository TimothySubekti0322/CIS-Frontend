"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { AlertChartParams, WatchlistParams } from "@/types/alert";
import { alertsApi } from "@/lib/api/alerts";
import { queryKeys } from "@/lib/query/keys";

/** How often the sidebar badge re-reads the crossing counter. */
const NOTIFICATION_POLL_MS = 60 * 1000;

export function useWatchlist(params?: WatchlistParams) {
  return useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => alertsApi.list(params),
    // Keep the current rows on screen while a search/page change refetches, so
    // the table fades to the new result rather than flashing empty.
    placeholderData: keepPreviousData,
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
 * Adding an already-watched claim is a no-op server-side, so a double-click
 * cannot desynchronise the bell icon.
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

/**
 * The sidebar counter. Crossings are stamped by the backend's hourly score
 * refresh (and immediately after a Harm edit), so a one-minute poll is well
 * inside the resolution of the underlying signal — polling faster would cost
 * requests without ever surfacing anything sooner.
 *
 * Mounted in the app shell, so it must never throw a page-level error: a
 * backend that doesn't yet support this endpoint simply shows no badge.
 */
export function useAlertNotifications() {
  return useQuery({
    queryKey: queryKeys.alerts.notifications,
    queryFn: () => alertsApi.notifications(),
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

/**
 * Acknowledges every crossing for THIS user — opening the watchlist page is
 * the acknowledgment.
 *
 * The response is the refreshed counter, so it is written straight into the
 * cache rather than triggering a re-read. The watchlist is invalidated too,
 * because `just_crossed` on each row clears with it — but only on the *next*
 * render, which is exactly why the caller fires this after the rows are shown.
 */
export function useAcknowledgeAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => alertsApi.acknowledge(),
    onSuccess: (notifications) => {
      qc.setQueryData(queryKeys.alerts.notifications, notifications);
      qc.invalidateQueries({ queryKey: queryKeys.alerts.list() });
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
