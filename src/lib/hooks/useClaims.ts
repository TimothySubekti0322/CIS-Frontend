"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ClaimListParams,
  ClaimRepositoryParams,
  ConfirmHarmPayload,
  ScoreHistoryParams,
  StatementListParams,
  UpdateClaimStatusPayload,
} from "@/types/claim";
import { claimsApi } from "@/lib/api/claims";
import { queryKeys } from "@/lib/query/keys";

/** F1 in one call — both sections, filtered, plus the "last fetched" label. */
export function useClaimRepository(params?: ClaimRepositoryParams) {
  return useQuery({
    queryKey: queryKeys.claims.repository(params),
    queryFn: () => claimsApi.repository(params),
  });
}

/** The paginated "See all" list. */
export function useClaims(params?: ClaimListParams) {
  return useQuery({
    queryKey: queryKeys.claims.list(params),
    queryFn: () => claimsApi.list(params),
  });
}

/** One claim, either type — the backend serves both from `GET /claims/:id`. */
export function useClaim(id: string) {
  return useQuery({
    queryKey: queryKeys.claims.detail(id),
    queryFn: () => claimsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useClaimStatements(
  id: string,
  params?: StatementListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.claims.statements(id, params),
    queryFn: () => claimsApi.statements(id, params),
    enabled: enabled && Boolean(id),
  });
}

export function useClaimTopAccounts(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.claims.topAccounts(id),
    queryFn: () => claimsApi.topAccounts(id),
    enabled: enabled && Boolean(id),
  });
}

export function useClaimPolicies(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.claims.policies(id),
    queryFn: () => claimsApi.policies(id),
    enabled: enabled && Boolean(id),
  });
}

/**
 * Score history. Empty until the claim joins the F3 watchlist — the snapshot
 * job captures watched claims only.
 */
export function useClaimScoreHistory(
  id: string,
  params?: ScoreHistoryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.claims.scoreHistory(id, params),
    queryFn: () => claimsApi.scoreHistory(id, params),
    enabled: enabled && Boolean(id),
  });
}

export function useUpdateClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateClaimStatusPayload & { id: string }) =>
      claimsApi.updateStatus(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.claims.detail(variables.id) });
      // A policy's claim lists embed the same review status.
      qc.invalidateQueries({ queryKey: queryKeys.policies.all });
    },
  });
}

/**
 * An analyst confirming or overriding the four Harm sub-scores (PRD 6.2.4).
 *
 * The response is the whole rescored claim, so it is written straight into the
 * detail cache rather than triggering a re-fetch. Every list that carries a
 * FinalClaimScore is invalidated because the rescore moves it.
 */
export function useConfirmHarm(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfirmHarmPayload) => claimsApi.confirmHarm(id, payload),
    onSuccess: (claim) => {
      qc.setQueryData(queryKeys.claims.detail(id), claim);
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}
