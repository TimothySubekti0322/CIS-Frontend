"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePolicyPayload, PolicyListParams } from "@/types/policy";
import { policiesApi } from "@/lib/api/policies";
import { queryKeys } from "@/lib/query/keys";

export function usePolicies(params?: PolicyListParams) {
  return useQuery({
    queryKey: queryKeys.policies.list(params),
    queryFn: () => policiesApi.list(params),
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
      qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

/**
 * Polls the AI matchmaking job (PRD US42) while a policy card / detail page is
 * showing the "Processing" state. Stops once the job reports "ready".
 */
export function useMatchmakingStatus(id: string, enabled: boolean) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.policies.matchmaking(id),
    queryFn: async () => {
      const res = await policiesApi.matchmakingStatus(id);
      if (res.processing === "ready") {
        qc.invalidateQueries({ queryKey: ["policies"] });
        qc.invalidateQueries({ queryKey: ["claims"] });
      }
      return res;
    },
    enabled: enabled && Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.processing === "ready" ? false : 2000,
  });
}
