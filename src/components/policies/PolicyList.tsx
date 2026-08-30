"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { PolicyStatus } from "@/types/policy";
import { strings } from "@/lib/constants/strings";
import { usePolicies, usePolicyYears } from "@/lib/hooks/usePolicies";
import { FilterChips } from "@/components/ui/FilterChips";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { PolicyCard } from "./PolicyCard";

export interface PolicyListProps {
  /** Page size. The F2 landing page shows a short list; "See all" paginates. */
  limit?: number;
  paginated?: boolean;
}

const STATUS_TABS: { value: PolicyStatus | "all"; label: string }[] = [
  { value: "all", label: strings.common.allStatus },
  { value: "rolled_out", label: strings.policies.rolledOut },
  { value: "not_rolled_out", label: strings.policies.notRolledOut },
];

/**
 * The shared F2 policy list. Year chips come from `GET /policies/years` rather
 * than being derived from the current page, so a year with no results on this
 * page is still offered.
 *
 * Ordering is the server's — newest linked-claim activity first — and is never
 * re-sorted here.
 */
export function PolicyList({ limit = 12, paginated = false }: PolicyListProps) {
  const [years, setYears] = useState<string[]>([]);
  const [status, setStatus] = useState<PolicyStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [years, status, search]);

  const { data: yearOptions } = usePolicyYears();

  const params = useMemo(
    () => ({
      years: years.length ? years.map(Number) : undefined,
      status: status === "all" ? undefined : status,
      q: search.trim() || undefined,
      page: paginated ? page : 1,
      limit,
    }),
    [years, status, search, page, limit, paginated],
  );

  const { data, isPending, isError } = usePolicies(params);
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <Tabs
        options={STATUS_TABS}
        value={status}
        onChange={setStatus}
        aria-label={strings.policies.filterStatus}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          options={(yearOptions ?? []).map((y) => ({
            value: String(y),
            label: String(y),
          }))}
          selected={years}
          onChange={setYears}
          allLabel={strings.common.allYears}
          aria-label="Filter by year"
          className="lg:flex-1"
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={strings.policies.search}
          className="lg:w-72"
        />
      </div>

      {isPending ? (
        <SkeletonCards count={limit} />
      ) : isError ? (
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-8" aria-hidden />}
          title={strings.common.noResults}
          description="Try clearing the year filter, status tab or search."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((p) => (
              <PolicyCard key={p.id} policy={p} />
            ))}
          </div>
          {paginated && data && (
            <Pagination meta={data.meta} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
