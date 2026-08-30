"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Granularity } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { useAlertChart, useWatchlist } from "@/lib/hooks/useAlerts";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { GranularitySelect } from "@/components/ui/GranularitySelect";
import { ScoreLineChart } from "@/components/alerts/ScoreLineChart";
import { ChartLegend } from "@/components/alerts/ChartLegend";
import { WatchlistTable } from "@/components/alerts/WatchlistTable";

const PAGE_SIZE = 20;

/**
 * F3 — Alert Page. Existing/Generic claims only; there is deliberately no
 * "add" action here — claims join through the F1/F2 bell icon.
 *
 * Search and pagination are server-side (`GET /alerts?q=&page=`), and the
 * chart is its own call (`GET /alerts/chart`) returning only the ticked
 * claims — so filtering the table never silently changes the chart.
 */
export default function AlertsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [granularity, setGranularity] = useState<Granularity>("week");

  useEffect(() => setPage(1), [search]);

  const listParams = useMemo(
    () => ({ q: search.trim() || undefined, page, limit: PAGE_SIZE }),
    [search, page],
  );

  const watchlist = useWatchlist(listParams);
  const chart = useAlertChart({ granularity });

  const items = watchlist.data?.items ?? [];
  // Only an unfiltered, first-page empty result means the watchlist is empty.
  const watchlistEmpty =
    !search.trim() && page === 1 && watchlist.data?.meta.total === 0;

  if (watchlist.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-sea-green" aria-label="Loading" />
      </div>
    );
  }

  if (watchlist.isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-h1">{strings.alerts.pageTitle}</h1>
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{strings.alerts.pageTitle}</h1>
        {!watchlistEmpty && (
          <GranularitySelect value={granularity} onChange={setGranularity} />
        )}
      </div>

      {watchlistEmpty ? (
        <EmptyState title={strings.alerts.empty} />
      ) : (
        <>
          {/* C1 + C2 — stack below the tablet breakpoint. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {chart.isPending ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-pale-sky bg-white">
                  <Loader2
                    className="size-5 animate-spin text-sea-green"
                    aria-label="Loading chart"
                  />
                </div>
              ) : chart.data ? (
                <ScoreLineChart chart={chart.data} />
              ) : (
                <EmptyState title={strings.errors.generic} />
              )}
            </div>
            <ChartLegend series={chart.data?.series ?? []} />
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

            {items.length === 0 ? (
              <EmptyState title={strings.common.noResults} />
            ) : (
              <>
                <WatchlistTable items={items} />
                {watchlist.data && (
                  <Pagination meta={watchlist.data.meta} onPageChange={setPage} />
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
