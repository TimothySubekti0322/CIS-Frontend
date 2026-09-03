"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClaimStatusFilter } from "@/types/claim";
import { STATUS_FILTER_TABS } from "@/lib/constants/statuses";
import { strings } from "@/lib/constants/strings";
import { useClaimRepository } from "@/lib/hooks/useClaims";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Tabs } from "@/components/ui/Tabs";
import { SearchBar } from "@/components/ui/SearchBar";
import { ClaimSection } from "@/components/claims/ClaimSection";
import { TopicFilter } from "@/components/claims/TopicFilter";

/**
 * F1 — Claim Repository Bank.
 *
 * The whole page is one call: `GET /claims/repository` returns both sections
 * already filtered and ranked. S1 and S2 are ALWAYS both visible — the status
 * tab filters within each section, it never hides one. Each section paginates
 * independently at 10 per page (PAGINATION_FOR_FE.md §2).
 *
 * Status, topics and search all live here rather than inside a section,
 * because the endpoint takes one set of filters and answers for both halves.
 */
export default function ClaimsPage() {
  const [status, setStatus] = useState<ClaimStatusFilter>("all");
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [existingPage, setExistingPage] = useState(1);
  const [nonExistingPage, setNonExistingPage] = useState(1);

  // The search box drives a network call, so wait for a pause in typing.
  const q = useDebouncedValue(search.trim(), 300);

  // Any filter change re-pages both sections from the top.
  useEffect(() => {
    setExistingPage(1);
    setNonExistingPage(1);
  }, [status, topicIds, q]);

  const params = useMemo(
    () => ({
      status,
      topicIds: topicIds.length ? topicIds : undefined,
      q: q || undefined,
      existingPage,
      nonExistingPage,
    }),
    [status, topicIds, q, existingPage, nonExistingPage],
  );
  const { data, isPending, isError } = useClaimRepository(params);

  const filtered = status !== "all" || topicIds.length > 0 || q.length > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-h1">{strings.claims.pageTitle}</h1>
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
            placeholder={strings.claims.searchAll}
            className="lg:w-80"
          />
        </div>
      </div>

      <ClaimSection
        claimType="existing"
        section={data?.existing}
        isPending={isPending}
        isError={isError}
        filtered={filtered}
        lastFetchedAt={data?.lastFetchedAt}
        onPageChange={setExistingPage}
      />

      <hr className="border-pale-sky" />

      <ClaimSection
        claimType="non_existing"
        section={data?.nonExisting}
        isPending={isPending}
        isError={isError}
        filtered={filtered}
        onPageChange={setNonExistingPage}
      />
    </div>
  );
}
