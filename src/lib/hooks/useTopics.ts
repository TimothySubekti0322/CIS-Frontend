"use client";

import { useQuery } from "@tanstack/react-query";
import { topicsApi } from "@/lib/api/topics";
import { queryKeys } from "@/lib/query/keys";

/**
 * The filter chips shared by F1's two sections. Topics are AI-owned and can
 * appear at any time (matchmaking creates new ones), so they are fetched
 * rather than read from a constant — the list is not fixed at build time.
 */
export function useTopics() {
  return useQuery({
    queryKey: queryKeys.topics.list,
    queryFn: () => topicsApi.list(),
    // Topics change only when the AI service adds one; no need to refetch often.
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopic(id: string) {
  return useQuery({
    queryKey: queryKeys.topics.detail(id),
    queryFn: () => topicsApi.get(id),
    enabled: Boolean(id),
  });
}
