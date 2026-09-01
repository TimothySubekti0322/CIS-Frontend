"use client";

import { useQuery } from "@tanstack/react-query";
import type { OverviewParams } from "@/types/overview";
import { overviewApi } from "@/lib/api/overview";
import { queryKeys } from "@/lib/query/keys";

/**
 * F6 in one call — O1a, O1b, O2 and O3 together.
 *
 * Nothing on this page is stored server-side; every figure is recomputed on
 * read from the same `claims` rows F1 ranks. That makes it cheap to refetch
 * and expensive to cache for long, so the data is treated as short-lived:
 * a stale leadership summary is worse than a slightly slower one.
 */
export function useOverview(params?: OverviewParams) {
  return useQuery({
    queryKey: queryKeys.overview.page(params),
    queryFn: () => overviewApi.get(params),
    staleTime: 30 * 1000,
  });
}

/**
 * The O2 treemap's click-through modal. Only fetched once a box is actually
 * clicked — the month-on-month figure behind it reads score snapshots, which
 * is not work worth doing for every box on every page load.
 */
export function useTopicOverview(id: string | null) {
  return useQuery({
    queryKey: queryKeys.overview.topic(id ?? ""),
    queryFn: () => overviewApi.topic(id as string),
    enabled: Boolean(id),
  });
}
