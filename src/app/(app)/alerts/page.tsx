"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { useWatchlist } from "@/lib/hooks/useAlerts";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreLineChart, type ChartSeries } from "@/components/alerts/ScoreLineChart";
import { ChartLegend } from "@/components/alerts/ChartLegend";
import { WatchlistTable } from "@/components/alerts/WatchlistTable";

/** F3 — Alert Page (PRD §8). Existing/Generic claims only. */
export default function AlertsPage() {
  const { data: items, isPending, isError } = useWatchlist();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggle = (claimId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const filtered = useMemo(
    () =>
      (items ?? []).filter((i) =>
        search.trim()
          ? i.statement.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [items, search],
  );

  // [C1]/[C2] show only ticked claims (PRD US28).
  const series: ChartSeries[] = useMemo(
    () =>
      (items ?? [])
        .filter((i) => checked.has(i.claimId))
        .map((item, colorIndex) => ({ item, colorIndex })),
    [items, checked],
  );

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-sea-green" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{strings.alerts.pageTitle}</h1>

      {isError ? (
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      ) : (items?.length ?? 0) === 0 ? (
        <EmptyState title={strings.alerts.empty} />
      ) : (
        <>
          {/* C1 + C2 — stack below the tablet breakpoint (PRD §5.2). */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ScoreLineChart series={series} />
            </div>
            <ChartLegend series={series} />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-h2">{strings.alerts.watchlistTitle}</h2>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={strings.alerts.search}
                className="sm:w-72"
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState title={strings.common.noResults} />
            ) : (
              <WatchlistTable items={filtered} checked={checked} onToggle={toggle} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
