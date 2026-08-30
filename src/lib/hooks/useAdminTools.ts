"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";

/**
 * F4 "Generate Generic Claim" (US33). Proxies to the AI service, which owns
 * the `claims` table — 503 when `AI_SERVICE_URL` is unconfigured.
 */
export function useGenerateGenericClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId?: string) => adminApi.generateGenericClaim(topicId),
    onSuccess: () => {
      // The new claim and the moved "last fetched" label both live on F1.
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.topics.all });
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

/** Forces an F3 chart-history snapshot without waiting for the hourly cron. */
export function useSnapshotScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.snapshotScores(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
}
