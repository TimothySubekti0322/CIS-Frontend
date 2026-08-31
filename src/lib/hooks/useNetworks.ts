"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountAnnexParams,
  AllowlistPayload,
  GenerateReportPayload,
  NetworkListParams,
  UpdateNetworkStatusPayload,
} from "@/types/network";
import { networksApi } from "@/lib/api/networks";
import { queryKeys } from "@/lib/query/keys";

/**
 * F5 read hooks.
 *
 * Every one of these can answer `503 SERVICE_UNAVAILABLE` when the detection
 * pipeline has not been deployed. That is a display case, not a retry case, so
 * nothing here retries on error beyond React Query's default.
 */

export function useNetworks(params?: NetworkListParams) {
  return useQuery({
    queryKey: queryKeys.networks.list(params),
    queryFn: () => networksApi.list(params),
  });
}

export function useNetwork(id: string) {
  return useQuery({
    queryKey: queryKeys.networks.detail(id),
    queryFn: () => networksApi.get(id),
    enabled: Boolean(id),
  });
}

export function useNetworkReviewLog(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.networks.reviewLog(id),
    queryFn: () => networksApi.reviewLog(id),
    enabled: enabled && Boolean(id),
  });
}

/** Nodes carry stored coordinates — nothing here recomputes a layout. */
export function useNetworkGraph(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.networks.graph(id),
    queryFn: () => networksApi.graph(id),
    enabled: enabled && Boolean(id),
  });
}

export function useNetworkTimeline(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.networks.timeline(id),
    queryFn: () => networksApi.timeline(id),
    enabled: enabled && Boolean(id),
  });
}

/** Snapshot content; a deleted post is still returned, marked. */
export function useNetworkContent(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.networks.content(id),
    queryFn: () => networksApi.content(id),
    enabled: enabled && Boolean(id),
  });
}

export function useNetworkAccounts(
  id: string,
  params?: AccountAnnexParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.networks.accounts(id, params),
    queryFn: () => networksApi.accounts(id, params),
    enabled: enabled && Boolean(id),
  });
}

/** Loaded only when a row is actually opened — one request per drawer. */
export function useNetworkAccount(id: string, accountId: string | null) {
  return useQuery({
    queryKey: queryKeys.networks.account(id, accountId ?? ""),
    queryFn: () => networksApi.account(id, accountId as string),
    enabled: Boolean(id && accountId),
  });
}

export function useNetworkReports(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.networks.reports(id),
    queryFn: () => networksApi.reports(id),
    enabled: enabled && Boolean(id),
  });
}

/* ------------------------------- mutations ------------------------------ */

/**
 * US52. The review log and the detail both change, and so does every list that
 * shows a status pill or a status count.
 */
export function useUpdateNetworkStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNetworkStatusPayload) =>
      networksApi.updateStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.networks.all });
      // A dismissal feeds the recalibration aggregates, and any status change
      // can open or close the export gate.
      qc.invalidateQueries({ queryKey: queryKeys.detection.all });
      // US61's badge hides a dismissed network from F1.
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
}

/**
 * US56 at network level. Allowlisting is retroactive: it suppresses historical
 * networks on every surface, F1's badge included, so the invalidation is broad.
 */
export function useAllowlistNetwork(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AllowlistPayload) =>
      networksApi.allowlistNetwork(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.networks.all });
      qc.invalidateQueries({ queryKey: queryKeys.allowlist.all });
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
}

/** US56 for a single member. */
export function useAllowlistAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      ...payload
    }: AllowlistPayload & { accountId: string }) =>
      networksApi.allowlistAccount(id, accountId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.networks.all });
      qc.invalidateQueries({ queryKey: queryKeys.allowlist.all });
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
}

/** US58/US59. Reports are versioned and never overwritten. */
export function useGenerateReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateReportPayload) =>
      networksApi.generateReport(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.networks.reports(id) });
      // The audit row is written before the document is rendered.
      qc.invalidateQueries({ queryKey: queryKeys.detection.all });
    },
  });
}

/** US60's ZIP. Same export gate, same audit ordering. */
export function useGenerateEvidenceBundle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => networksApi.evidenceBundle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.networks.reports(id) });
      qc.invalidateQueries({ queryKey: queryKeys.detection.all });
    },
  });
}
