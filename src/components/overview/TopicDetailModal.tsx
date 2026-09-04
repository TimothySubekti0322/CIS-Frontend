"use client";

import Link from "next/link";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { TopicOverview, TrendDirection } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTopicOverview } from "@/lib/hooks/useOverview";

/**
 * Topic detail: title, claims above threshold, average score, month-on-month
 * change, and the above/under ratio.
 *
 * Fetched on open rather than with the page — the MoM figure reads the AI
 * service's score snapshots, which is not work worth doing for every box on
 * every load.
 */
export function TopicDetailModal({
  topicId,
  onClose,
}: {
  /** `null` closes the dialog and stops the query. */
  topicId: string | null;
  onClose: () => void;
}) {
  const { data, isPending, isError } = useTopicOverview(topicId);

  return (
    <Modal
      open={Boolean(topicId)}
      onClose={onClose}
      title={data?.topic.name ?? strings.overview.topicModalTitle}
      className="max-w-lg"
    >
      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError || !data ? (
        <EmptyState title={strings.errors.notFound} className="border-0 bg-transparent" />
      ) : (
        <TopicDetail detail={data} onNavigate={onClose} />
      )}
    </Modal>
  );
}

function TopicDetail({
  detail,
  onNavigate,
}: {
  detail: TopicOverview;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3">
        <Stat
          label={strings.overview.ratioAbove}
          value={String(detail.aboveThresholdCount)}
          tone="danger"
        />
        <Stat
          label={strings.overview.ratioBelow}
          value={String(detail.belowThresholdCount)}
          tone="success"
        />
        <Stat
          label={strings.overview.topicsAverage}
          value={
            detail.averageScore === null
              ? strings.common.notAvailable
              : detail.averageScore.toFixed(1)
          }
        />
        <Stat
          label={strings.overview.topicRatio}
          value={
            // `null` when nothing is under threshold: printing "Infinity"
            // beside a risk figure is worse than printing nothing.
            detail.aboveUnderRatio === null
              ? strings.common.notAvailable
              : detail.aboveUnderRatio.toFixed(2)
          }
          hint={
            detail.aboveUnderRatio === null ? strings.overview.topicRatioEmpty : undefined
          }
        />
      </dl>

      <MonthOnMonth detail={detail} />

      {/* The paginated list is what takes a topic filter, and the treemap only
          ever counts Existing claims — so the drill-down lands on exactly the
          population this modal just described. */}
      <Link
        href={`/claims/all?type=existing&topic_ids=${encodeURIComponent(detail.topic.id)}`}
        onClick={onNavigate}
        className="inline-flex items-center gap-1 text-sm font-bold text-sea-green hover:underline"
      >
        {strings.overview.topicOpen}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * ▲ green / ▼ red. `null` is a real state — there is not enough history on
 * both sides of the comparison, or the previous average was zero and the
 * percentage is undefined — and it says so rather than showing 0%.
 */
function MonthOnMonth({ detail }: { detail: TopicOverview }) {
  const percent = detail.averageScoreMomPercent;

  if (percent === null) {
    return (
      <div className="rounded-lg bg-mint-cream p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-regal-navy/50">
          {strings.overview.topicMom}
        </p>
        <p className="mt-1 text-sm text-regal-navy/60">
          {strings.overview.topicMomEmpty}
        </p>
      </div>
    );
  }

  const direction: TrendDirection = detail.momDirection ?? "flat";
  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <div className="rounded-lg bg-mint-cream p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-regal-navy/50">
        {strings.overview.topicMom}
      </p>
      <p
        className={cn(
          "mt-1 inline-flex items-center gap-1.5 text-lg font-bold tabular-nums",
          // A topic's average score rising is bad news, so "up" is red here —
          // the opposite of the CSI gauge, where up means healthier.
          direction === "up" && "text-danger",
          direction === "down" && "text-sea-green",
          direction === "flat" && "text-regal-navy/60",
        )}
      >
        <Icon className="size-4" aria-hidden />
        {percent > 0 ? "+" : ""}
        {percent.toFixed(1)}%
      </p>
      <p className="mt-1 text-xs text-regal-navy/60">
        {strings.overview.topicCurrentMonth}:{" "}
        {format(detail.currentMonthAverage)} · {strings.overview.topicPreviousMonth}:{" "}
        {format(detail.previousMonthAverage)}
      </p>
    </div>
  );
}

function format(value: number | null): string {
  return value === null ? strings.common.notAvailable : value.toFixed(1);
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "danger" | "success";
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-regal-navy/60">{label}</dt>
      <dd
        className={cn(
          "text-xl font-bold tabular-nums",
          tone === "danger" && "text-danger",
          tone === "success" && "text-sea-green",
          !tone && "text-regal-navy",
        )}
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-regal-navy/50">{hint}</p>}
    </div>
  );
}
