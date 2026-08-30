"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { usePolicies } from "@/lib/hooks/usePolicies";
import { FilterChips } from "@/components/ui/FilterChips";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { PolicyCard } from "./PolicyCard";

export interface PolicyListProps {
  /** Top-N shown (omit for the full "See all" list). */
  limit?: number;
}

/** Shared F2 policy list: year filter + search + responsive card grid (US34–US38). */
export function PolicyList({ limit }: PolicyListProps) {
  const [years, setYears] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Unfiltered fetch purely to derive the available year chips (PRD US34).
  const all = usePolicies();
  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    (all.data?.items ?? []).forEach((p) =>
      set.add(new Date(p.rolledOutDate).getFullYear()),
    );
    return [...set]
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
  }, [all.data]);

  const params = useMemo(
    () => ({
      years: years.length ? years.map(Number) : undefined,
      search: search.trim() || undefined,
      limit,
    }),
    [years, search, limit],
  );
  const { data, isPending, isError } = usePolicies(params);
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          options={yearOptions}
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
        <SkeletonCards count={limit ?? 8} />
      ) : isError ? (
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-8" aria-hidden />}
          title={strings.common.noResults}
          description="Try clearing the year filter or search."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((p) => (
            <PolicyCard key={p.id} policy={p} />
          ))}
        </div>
      )}
    </div>
  );
}
