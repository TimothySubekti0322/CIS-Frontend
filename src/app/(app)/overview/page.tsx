"use client";

import { useState } from "react";
import { strings } from "@/lib/constants/strings";
import { useOverview } from "@/lib/hooks/useOverview";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { CityContextBar } from "@/components/overview/CityContextBar";
import { ThresholdRatioCard } from "@/components/overview/ThresholdRatioCard";
import { SentimentGauge } from "@/components/overview/SentimentGauge";
import { TopicTreemap } from "@/components/overview/TopicTreemap";
import { TopicDetailModal } from "@/components/overview/TopicDetailModal";
import { HotPoliciesTable } from "@/components/overview/HotPoliciesTable";

/**
 * The whole page is one call. `GET /overview` returns all three sections
 * together for the same reason `GET /claims/repository` does: they are read on
 * every load, and three round trips to render one screen buys nothing.
 *
 * The one thing to keep intact here is the failure boundary. The sentiment
 * gauge depends on a content-stream column the AI service may not have
 * provisioned; the ratio card and the topics/policies sections come from
 * `claims` and are unaffected. So a non-`ok` sentiment status costs exactly
 * one card — the gauge renders its own reason and everything else on the
 * page still renders normally.
 *
 * This is the one page allowed to be visually bold. It still draws solely
 * from the shared palette plus the one reserved warm red.
 */
export default function OverviewPage() {
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  // "Top Policies" is capped at 5 rows (see PAGINATION_FOR_FE.md).
  const { data, isPending, isError } = useOverview({ limit: 5 });

  if (isPending) return <OverviewSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-h1">{strings.overview.pageTitle}</h1>
        <EmptyState
          title={strings.errors.generic}
          description={strings.errors.liveModeUnavailable}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-h1">{strings.overview.pageTitle}</h1>
        <CityContextBar city={data.city} generatedAt={data.generatedAt} />
      </header>

      {/* Ratio and gauge side by side above tablet, stacked below. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ThresholdRatioCard ratio={data.thresholdRatio} />
        <SentimentGauge sentiment={data.sentiment} />
      </div>

      <TopicTreemap topics={data.topics} onSelect={setOpenTopicId} />

      <HotPoliciesTable policies={data.policies} />

      <TopicDetailModal
        topicId={openTopicId}
        onClose={() => setOpenTopicId(null)}
      />
    </div>
  );
}

/** Mirrors the real layout, so the page does not reflow once data arrives. */
function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
