"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api/alerts";
import { queryKeys } from "@/lib/query/keys";

export function useWatchlist() {
  return useQuery({
    queryKey: queryKeys.alerts.watchlist,
    queryFn: () => alertsApi.listWatchlist(),
  });
}

export function useToggleWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, add }: { claimId: string; add: boolean }) =>
      add
        ? alertsApi.addToWatchlist(claimId)
        : alertsApi.removeFromWatchlist(claimId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}
