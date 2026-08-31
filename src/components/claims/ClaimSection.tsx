"use client";

import type { ClaimRepositorySection, ClaimType } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { ClaimGrid } from "./ClaimGrid";

export interface ClaimSectionProps {
  claimType: ClaimType;
  /** The matching half of `GET /claims/repository`, once it has loaded. */
  section?: ClaimRepositorySection;
  isPending: boolean;
  isError: boolean;
  lastFetchedAt?: string | null;
  seeAllHref?: string;
  /** True when a page-level filter is narrowing the results. */
  filtered: boolean;
}

const SECTION_SIZE = 10;

/**
 * One F1 section — [S1] Existing or [S2] Non-Existing. Both always render:
 * the status tab narrows claims *within* a section, it never hides one.
 *
 * Purely presentational. Status, topics and search are page-level because the
 * repository endpoint takes one set of filters and returns both sections in a
 * single call — a per-section control here would have to fire its own request
 * and re-filter the other half for nothing.
 */
export function ClaimSection({
  claimType,
  section,
  isPending,
  isError,
  lastFetchedAt,
  seeAllHref,
  filtered,
}: ClaimSectionProps) {
  const isExisting = claimType === "existing";
  const claims = section?.claims ?? [];
  const total = section?.totalInPool ?? 0;

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

      {isPending ? (
        <SkeletonCards count={SECTION_SIZE} />
      ) : isError ? (
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      ) : claims.length === 0 ? (
        <EmptyState
          title={strings.common.noResults}
          description={
            filtered
              ? "Try clearing the topic filter, status tab or search."
              : undefined
          }
        />
      ) : (
        <ClaimGrid claims={claims} />
      )}
    </section>
  );
}
