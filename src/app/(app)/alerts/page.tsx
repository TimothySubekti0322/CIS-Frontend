"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Granularity } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  useAcknowledgeAlerts,
  useAlertChart,
  useWatchlist,
} from "@/lib/hooks/useAlerts";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { GranularitySelect } from "@/components/ui/GranularitySelect";
import { ScoreLineChart } from "@/components/alerts/ScoreLineChart";
import { ChartLegend } from "@/components/alerts/ChartLegend";
import { WatchlistTable } from "@/components/alerts/WatchlistTable";

const PAGE_SIZE = 10;

/**
 * Existing/Generic claims only; there is deliberately no "add" action here —
 * claims join through the bell icon elsewhere.
 *
 * Search and pagination are server-side (`GET /alerts?q=&page=`), and the
 * chart is its own call (`GET /alerts/chart`) returning only the ticked
 * claims — so filtering the table never silently changes the chart.
 */
export default function AlertsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [granularity, setGranularity] = useState<Granularity>("week");

  // The search box drives a server call, so hold off until typing pauses for
  // ~1s, then load once. `search` still updates the input instantly.
  const q = useDebouncedValue(search.trim(), 1000);

  useEffect(() => setPage(1), [q]);

  const listParams = useMemo(
    () => ({ q: q || undefined, page, limit: PAGE_SIZE }),
    [q, page],
  );

  const watchlist = useWatchlist(listParams);
  const chart = useAlertChart({ granularity });

  const items = watchlist.data?.items ?? [];

  /* Opening this page IS the acknowledgment.
   *
   * It runs once per visit, and only once the first page of rows has actually
   * arrived: acknowledging is what makes the *next* render unhighlighted, so
   * acknowledging before the rows are in hand would clear the very highlights
   * the user came here to see. A ref rather than state, because this must not
   * re-run when the list refetches on search or paging. */
  const acknowledge = useAcknowledgeAlerts();
  const acknowledgedRef = useRef(false);
  const rowsRendered = watchlist.isSuccess;
  const acknowledgeMutate = acknowledge.mutate;

  useEffect(() => {
    if (!rowsRendered || acknowledgedRef.current) return;
    acknowledgedRef.current = true;
    // Fire and forget: a failed acknowledgment leaves the badge up, which is
    // the safe direction — it is never a reason to fail the page.
    acknowledgeMutate();
  }, [rowsRendered, acknowledgeMutate]);

  // Only an unfiltered, first-page empty result means the watchlist is empty.
  const watchlistEmpty =
    !q && page === 1 && watchlist.data?.meta.total === 0;

  // A refetch triggered by search/paging while rows are already on screen.
  const tableRefetching = watchlist.isFetching && !watchlist.isPending;

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
          <GranularitySelect
            value={granularity}
            onChange={setGranularity}
            showLabel={false}
          />
        )}
      </div>

      {watchlistEmpty ? (
        <EmptyState title={strings.alerts.empty} />
      ) : (
        <>
          {/* Chart and legend stack below the tablet breakpoint. */}
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-center">
              <h2 className="text-h2 lg:col-span-2">
                {strings.alerts.watchlistTitle}
              </h2>
              {/* Matches the legend's width — same lg:grid-cols-3 track. */}
              <div className="flex items-center gap-2">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder={strings.alerts.search}
                  className="flex-1"
                />
                {tableRefetching && (
                  <Loader2
                    className="size-4 shrink-0 animate-spin text-sea-green"
                    aria-label={strings.common.loading}
                  />
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <EmptyState title={strings.common.noResults} />
            ) : (
              <div
                className={tableRefetching ? "opacity-60 transition-opacity" : undefined}
              >
                <WatchlistTable items={items} />
                {watchlist.data && (
                  <Pagination meta={watchlist.data.meta} onPageChange={setPage} />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
