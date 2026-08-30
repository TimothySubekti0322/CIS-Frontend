"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePolicyPayload,
  PolicyListParams,
  UpdatePolicyPayload,
} from "@/types/policy";
import { policiesApi } from "@/lib/api/policies";
import { queryKeys } from "@/lib/query/keys";

export function usePolicies(params?: PolicyListParams) {
  return useQuery({
    queryKey: queryKeys.policies.list(params),
    queryFn: () => policiesApi.list(params),
  });
}

/** Distinct rolled-out years for the filter chips — its own cheap endpoint. */
export function usePolicyYears() {
  return useQuery({
    queryKey: queryKeys.policies.years,
    queryFn: () => policiesApi.years(),
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: queryKeys.policies.detail(id),
    queryFn: () => policiesApi.get(id),
    enabled: Boolean(id),
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePolicyPayload) => policiesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}

export function useUpdatePolicy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePolicyPayload) => policiesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policiesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}

/** Re-queue matchmaking after a `failed` status. */
export function useRematchPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policiesApi.rematch(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.policies.processing(id) });
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}

/**
 * Polls `GET /policies/:id/processing` at the documented 3-5s cadence while a
 * card or detail page shows the "Processing" badge, then stops and refreshes
 * the lists — that is the moment `ai_policy_id` lands and correlations resolve.
 */
export function usePolicyProcessing(id: string, enabled: boolean) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.policies.processing(id),
    queryFn: async () => {
      const res = await policiesApi.processing(id);
      if (!res.isProcessing) {
        qc.invalidateQueries({ queryKey: queryKeys.policies.all });
        qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      }
      return res;
    },
    enabled: enabled && Boolean(id),
    refetchInterval: (query) =>
      query.state.data && !query.state.data.isProcessing ? false : 3000,
  });
}

/** Streams the document through the api client so the Bearer header is sent. */
export function useDownloadPolicyFile() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string | null }) =>
      policiesApi.download(id, fileName),
  });
}
