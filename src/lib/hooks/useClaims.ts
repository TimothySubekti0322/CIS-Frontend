"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClaimListParams, ClaimStatus } from "@/types/claim";
import { claimsApi } from "@/lib/api/claims";
import { queryKeys } from "@/lib/query/keys";

export function useGenericClaims(params?: ClaimListParams) {
  return useQuery({
    queryKey: queryKeys.claims.generic(params),
    queryFn: () => claimsApi.listGeneric(params),
  });
}

export function useSyntheticClaims(params?: ClaimListParams) {
  return useQuery({
    queryKey: queryKeys.claims.synthetic(params),
    queryFn: () => claimsApi.listSynthetic(params),
  });
}

export function useGenericClaim(id: string) {
  return useQuery({
    queryKey: queryKeys.claims.genericDetail(id),
    queryFn: () => claimsApi.getGeneric(id),
    enabled: Boolean(id),
  });
}

export function useSyntheticClaim(id: string) {
  return useQuery({
    queryKey: queryKeys.claims.syntheticDetail(id),
    queryFn: () => claimsApi.getSynthetic(id),
    enabled: Boolean(id),
  });
}

export function useUpdateClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClaimStatus }) =>
      claimsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

export function useGenerateGenericClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => claimsApi.generateGeneric(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}
