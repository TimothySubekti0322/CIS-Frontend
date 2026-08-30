"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ClaimListParams, ClaimStatusFilter, ClaimType } from "@/types/claim";
import { STATUS_FILTER_TABS } from "@/lib/constants/statuses";
import { strings } from "@/lib/constants/strings";
import { useClaims } from "@/lib/hooks/useClaims";
import { BackLink } from "@/components/ui/BackLink";
import { Tabs } from "@/components/ui/Tabs";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { ClaimGrid } from "@/components/claims/ClaimGrid";
import { TopicFilter } from "@/components/claims/TopicFilter";

const PAGE_SIZE = 20;

/** The "See all" list — `GET /claims`, paginated and sorted server-side. */
function SeeAllContent() {
  const searchParams = useSearchParams();
  const type: ClaimType =
    searchParams.get("type") === "non_existing" ? "non_existing" : "existing";

  const [status, setStatus] = useState<ClaimStatusFilter>(
    (searchParams.get("status") ?? "all") as ClaimStatusFilter,
  );
  const [topicIds, setTopicIds] = useState<string[]>(
    searchParams.get("topic_ids")?.split(",").filter(Boolean) ?? [],
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Any filter change invalidates the current page number.
  useEffect(() => setPage(1), [status, topicIds, search, type]);

  const params = useMemo<ClaimListParams>(
    () => ({
      type,
      status,
      topicIds: topicIds.length ? topicIds : undefined,
      q: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [type, status, topicIds, search, page],
  );

  const { data, isPending, isError } = useClaims(params);
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <BackLink href="/claims" label={strings.claims.pageTitle} />

      <h1 className="text-h1">
        {type === "existing"
          ? strings.claims.seeAllGeneric
          : strings.claims.seeAllSynthetic}
      </h1>

      <Tabs
        options={STATUS_FILTER_TABS}
        value={status}
        onChange={setStatus}
        aria-label="Filter claims by status"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TopicFilter
          selected={topicIds}
          onChange={setTopicIds}
          className="lg:flex-1"
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={
            type === "existing" ? strings.claims.searchS1 : strings.claims.searchS2
          }
          className="lg:w-72"
        />
      </div>

      {isPending ? (
        <SkeletonCards count={PAGE_SIZE} />
      ) : isError ? (
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
        <>
          <ClaimGrid claims={items} />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

export default function ClaimsSeeAllPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-regal-navy/60">{strings.common.loading}</p>
      }
    >
      <SeeAllContent />
    </Suspense>
  );
}
