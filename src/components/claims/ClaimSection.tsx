"use client";

import { useMemo, useState } from "react";
import type { ClaimStatus } from "@/types/claim";
import { TOPICS } from "@/lib/constants/topics";
import { strings } from "@/lib/constants/strings";
import { useGenericClaims, useSyntheticClaims } from "@/lib/hooks/useClaims";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FilterChips } from "@/components/ui/FilterChips";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { ClaimGrid } from "./ClaimGrid";

export interface ClaimSectionProps {
  variant: "generic" | "synthetic";
  /** Page-level status filter from the F1 tabs (PRD US1). */
  statusFilter: ClaimStatus | "all";
  /** Top-N shown in the section (10 on F1 — US7/US16). Omit for full lists. */
  limit?: number;
  seeAllHref?: string;
}

const TOPIC_OPTIONS = TOPICS.map((t) => ({ value: t.id, label: t.label }));

/**
 * Shared section shell for [S1] Existing and [S2] Non-Existing claims
 * (PRD §4.2 / §4.3). Same card shell, same filter/search placement so users
 * transfer learned behaviour between the two (PRD §5.3).
 */
export function ClaimSection({
  variant,
  statusFilter,
  limit,
  seeAllHref,
}: ClaimSectionProps) {
  const isGeneric = variant === "generic";
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({
      topicIds: topicIds.length ? topicIds : undefined,
      status: statusFilter,
      search: search.trim() || undefined,
      limit,
    }),
    [topicIds, statusFilter, search, limit],
  );

  const generic = useGenericClaims(isGeneric ? params : undefined);
  const synthetic = useSyntheticClaims(isGeneric ? undefined : params);
  const query = isGeneric ? generic : synthetic;

  const items = query.data?.items ?? [];
  const lastFetchedAt = isGeneric ? generic.data?.lastFetchedAt : undefined;

  return (
    <section className="space-y-4">
      <SectionHeader
        title={isGeneric ? strings.claims.s1Title : strings.claims.s2Title}
        subtitle={isGeneric ? strings.claims.s1Subtitle : strings.claims.s2Subtitle}
        lastFetchedAt={lastFetchedAt}
        seeAllHref={seeAllHref}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          options={TOPIC_OPTIONS}
          selected={topicIds}
          onChange={setTopicIds}
          allLabel={strings.common.allTopics}
          aria-label="Filter by topic"
          className="lg:flex-1"
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={isGeneric ? strings.claims.searchS1 : strings.claims.searchS2}
          className="lg:w-72"
        />
      </div>

      {query.isPending ? (
        <SkeletonCards count={limit ?? 8} />
      ) : query.isError ? (
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={strings.common.noResults}
          description="Try clearing the topic filter, status tab or search."
        />
      ) : (
        <ClaimGrid claims={items} />
      )}
    </section>
  );
}
