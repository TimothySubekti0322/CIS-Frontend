"use client";

import { useState } from "react";
import type {
  ConfidenceBand,
  NetworkSort,
  NetworkStatusFilter,
} from "@/types/network";
import { strings } from "@/lib/constants/strings";
import {
  CONFIDENCE_BANDS,
  NETWORK_SORTS,
  NETWORK_STATUS_TABS,
} from "@/lib/constants/networkStatuses";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useNetworks } from "@/lib/hooks/useNetworks";
import { useTopics } from "@/lib/hooks/useTopics";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { Field } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { NetworkCard } from "./NetworkCard";
import { DetectorUnavailable, isDetectorUnavailable } from "./DetectorUnavailable";

/**
 * The network list.
 *
 * Medium and High are the default set. Low-band networks are revealed only by
 * the explicit toggle and come back flagged by the server, de-emphasised and
 * labelled — never silently mixed in. A network invisible here is also
 * unreachable through a claim page.
 */
export function NetworkListView() {
  const [status, setStatus] = useState<NetworkStatusFilter>("all");
  const [bands, setBands] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [showLow, setShowLow] = useState(false);
  const [sort, setSort] = useState<NetworkSort>("score");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const debounced = useDebouncedValue(search, 300);
  const { data: topics } = useTopics();

  const { data, isPending, error } = useNetworks({
    status,
    confidence: bands.length ? (bands as ConfidenceBand[]) : undefined,
    showLowConfidence: showLow || undefined,
    topicIds: topicIds.length ? topicIds : undefined,
    q: debounced || undefined,
    detectedFrom: from || undefined,
    detectedTo: to || undefined,
    sort,
    page,
    limit: 12,
  });

  if (isDetectorUnavailable(error)) {
    return <DetectorUnavailable error={error} />;
  }

  const networks = data?.result.networks ?? [];
  const counts = data?.result.statusCounts ?? {};

  /** Reset to page 1 whenever a filter narrows or widens the result set. */
  function withReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-5">
      <Tabs
        options={NETWORK_STATUS_TABS.map((tab) => ({
          value: tab.value,
          label:
            tab.value === "all"
              ? tab.label
              : `${tab.label}${counts[tab.value] ? ` (${counts[tab.value]})` : ""}`,
        }))}
        value={status}
        onChange={withReset<NetworkStatusFilter>(setStatus)}
        aria-label={strings.networks.reviewStatus}
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchBar
          value={search}
          onChange={withReset(setSearch)}
          placeholder={strings.networks.search}
          className="min-w-56 flex-1"
        />
        <label className="flex flex-col gap-1 text-xs text-regal-navy/60">
          {strings.networks.sort}
          <select
            value={sort}
            onChange={(e) => withReset<NetworkSort>(setSort)(e.target.value as NetworkSort)}
            className="h-10 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
          >
            {NETWORK_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label={strings.networks.detectedFrom}
          type="date"
          value={from}
          onChange={(e) => withReset(setFrom)(e.target.value)}
        />
        <Field
          label={strings.networks.detectedTo}
          type="date"
          value={to}
          onChange={(e) => withReset(setTo)(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-regal-navy/60">
          {strings.networks.confidenceFilter}
        </p>
        <FilterChips
          options={CONFIDENCE_BANDS.map((b) => ({ value: b.value, label: b.label }))}
          selected={bands}
          onChange={withReset(setBands)}
          allLabel={strings.common.allStatus}
          aria-label={strings.networks.confidenceFilter}
        />
      </div>

      {topics && topics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-regal-navy/60">
            {strings.common.allTopics}
          </p>
          <FilterChips
            options={topics.map((t) => ({ value: t.id, label: t.name }))}
            selected={topicIds}
            onChange={withReset(setTopicIds)}
            allLabel={strings.common.allTopics}
            aria-label={strings.common.allTopics}
          />
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-pale-sky bg-white px-3 py-2">
        <input
          type="checkbox"
          checked={showLow}
          onChange={(e) => withReset(setShowLow)(e.target.checked)}
          className="mt-0.5 size-4 accent-sea-green"
        />
        <span>
          <span className="block text-sm font-bold text-regal-navy">
            {strings.networks.showLowConfidence}
          </span>
          <span className="block text-xs text-regal-navy/60">
            {strings.networks.lowConfidenceHint}
          </span>
        </span>
      </label>

      {isPending ? (
        <SkeletonCards count={6} />
      ) : networks.length === 0 ? (
        <EmptyState
          title={
            search || bands.length || topicIds.length || status !== "all" || from || to
              ? strings.networks.empty
              : strings.networks.emptyAll
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {networks.map((network) => (
              <NetworkCard key={network.id} network={network} />
            ))}
          </div>
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
