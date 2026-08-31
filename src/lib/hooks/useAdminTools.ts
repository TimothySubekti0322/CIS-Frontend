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

/**
 * Re-evaluates every Existing claim's score. Long-running: the AI service does
 * LLM work inside the request, so the caller must show a progress affordance.
 */
export function useRescoreClaims() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.rescore(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

/**
 * "Generate sample data". Until a live crawler exists this is the only route
 * new content — and therefore new Existing claims — takes into the system.
 */
export function useGenerateSampleContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: Parameters<typeof adminApi.generateSampleContent>[0]) =>
      adminApi.generateSampleContent(options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.topics.all });
      // New content moves the S1 "last fetched" label.
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

/** Forces a clustering pass. Normally unnecessary — ingestion triggers one. */
export function useClusterNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.clusterNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.topics.all });
    },
  });
}

/**
 * Clears backend rows orphaned by an AI-side reseed.
 *
 * A dry run changes nothing, so nothing is invalidated for it — only a real
 * sweep touches reviews, watchlist rows and policy links.
 */
export function useReconcile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: { dryRun?: boolean; force?: boolean }) =>
      adminApi.reconcile(options),
    onSuccess: (result) => {
      if (result.dryRun) return;
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}
