"use client";

import { useMemo, useState } from "react";
import type {
  ClaimRepositorySection,
  ClaimStatusFilter,
  ClaimType,
} from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { useClaims } from "@/lib/hooks/useClaims";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { ClaimGrid } from "./ClaimGrid";

export interface ClaimSectionProps {
  claimType: ClaimType;
  /** The matching half of `GET /claims/repository`, once it has loaded. */
  section?: ClaimRepositorySection;
  isPending: boolean;
  isError: boolean;
  /** Page-level filters, forwarded to `GET /claims` when a search is active. */
  status: ClaimStatusFilter;
  topicIds: string[];
  lastFetchedAt?: string | null;
  seeAllHref?: string;
}

const SECTION_SIZE = 10;

/**
 * One F1 section — [S1] Existing or [S2] Non-Existing. Both always render:
 * the status tab narrows claims *within* a section, it never hides one.
 *
 * The repository endpoint takes no free-text parameter, so typing in the
 * search box switches this section to `GET /claims?q=…` (same card shape,
 * same filters) rather than filtering the ten rows already on screen — a
 * client-side filter would silently search only the top ten.
 * See MISSING_ENDPOINT.MD §2.
 */
export function ClaimSection({
  claimType,
  section,
  isPending,
  isError,
  status,
  topicIds,
  lastFetchedAt,
  seeAllHref,
}: ClaimSectionProps) {
  const isExisting = claimType === "existing";
  const [search, setSearch] = useState("");
  const query = search.trim();

  const searchParams = useMemo(
    () => ({
      type: claimType,
      status,
      topicIds: topicIds.length ? topicIds : undefined,
      q: query,
      limit: SECTION_SIZE,
    }),
    [claimType, status, topicIds, query],
  );

  const searchQuery = useClaims(query ? searchParams : undefined);
  const searching = Boolean(query);

  const claims = searching ? (searchQuery.data?.items ?? []) : (section?.claims ?? []);
  const total = searching
    ? (searchQuery.data?.meta.total ?? 0)
    : (section?.totalInPool ?? 0);
  const pending = searching ? searchQuery.isPending : isPending;
  const errored = searching ? searchQuery.isError : isError;

  return (
    <section className="space-y-4">
      <SectionHeader
        title={isExisting ? strings.claims.s1Title : strings.claims.s2Title}
        subtitle={isExisting ? strings.claims.s1Subtitle : strings.claims.s2Subtitle}
        lastFetchedAt={lastFetchedAt ?? undefined}
        seeAllHref={seeAllHref}
        right={
          total > 0 ? (
            <span className="text-xs text-regal-navy/50">
              {claims.length} of {total.toLocaleString()}
            </span>
          ) : undefined
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={isExisting ? strings.claims.searchS1 : strings.claims.searchS2}
        className="lg:w-96"
      />

      {pending ? (
        <SkeletonCards count={SECTION_SIZE} />
      ) : errored ? (
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      ) : claims.length === 0 ? (
        <EmptyState
          title={strings.common.noResults}
          description="Try clearing the topic filter, status tab or search."
        />
      ) : (
        <ClaimGrid claims={claims} />
      )}
    </section>
  );
}
