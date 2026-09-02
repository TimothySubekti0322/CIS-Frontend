"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, FileText, History, Users } from "lucide-react";
import type { NetworkCard as NetworkCardModel } from "@/types/network";
import { cn, formatDate } from "@/lib/utils";
import { scoreTextClasses } from "@/lib/scoring";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import {
  ConfidencePill,
  LowConfidenceTag,
  NetworkStatusPill,
  TruncatedRunPill,
} from "./NetworkPills";

export interface NetworkCardProps {
  network: NetworkCardModel;
}

/**
 * US46's triage card.
 *
 * Everything on it is either a count or a computed band; the one judgement is
 * the review-status pill, which a person set. A low-confidence card is
 * de-emphasised from the `lowConfidence` flag the backend sets rather than by
 * re-deriving the banding rule here.
 */
export function NetworkCard({ network }: NetworkCardProps) {
  const router = useRouter();
  const href = `/coordinated-network/${network.id}`;

  return (
    <Card
      interactive
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className={cn(
        "flex h-full flex-col gap-3",
        network.lowConfidence && "opacity-75",
      )}
    >
      {/* The score leads the card: triage on this list is a ranking exercise,
          and a number read at a glance is what makes it one. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ConfidencePill band={network.confidenceBand} />
        </div>
        <div
          className="shrink-0 text-right"
          title={`${strings.networks.coordinationScore} ${network.coordinationScore.toFixed(1)} / 100`}
        >
          <span
            className={cn(
              "block text-3xl leading-none font-bold tabular-nums",
              scoreTextClasses(network.coordinationScore),
            )}
          >
            {network.coordinationScore.toFixed(1)}
          </span>
          <span className="mt-1 block text-[10px] font-bold tracking-wider text-regal-navy/50 uppercase">
            {strings.networks.scoreCaption}
          </span>
        </div>
      </div>

      <p className="line-clamp-2 flex-none text-sm font-bold text-regal-navy">
        {network.label}
      </p>

      {network.primaryClaim && (
        <p className="line-clamp-2 flex-1 text-xs text-regal-navy/70">
          <span className="font-bold">{strings.networks.primaryClaim}: </span>
          {network.primaryClaim.claimStatement}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-regal-navy/60">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden />
          {network.accountCount.toLocaleString()} {strings.networks.accounts}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="size-3.5" aria-hidden />
          {network.postCount.toLocaleString()} {strings.networks.posts}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="size-3.5" aria-hidden />
          {formatDate(network.detectedAt)}
        </span>
      </div>

      {network.platforms.length > 0 && (
        <p className="text-xs text-regal-navy/50">
          {network.platforms.join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {/* "Seen 3x since 12 Jun" — a recurrence inherits history but not
            relevance, so the count and its start date are both stated. */}
        {network.recurrence.isRecurrence && network.recurrence.count > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-regal-navy">
            <History className="size-3" aria-hidden />
            {strings.networks.recurrenceSeen} {network.recurrence.count}×
            {network.recurrence.firstSeenAt
              ? ` ${strings.networks.recurrenceSince} ${formatDate(
                  network.recurrence.firstSeenAt,
                )}`
              : ""}
          </span>
        )}
        {network.fromTruncatedRun && <TruncatedRunPill />}
        {network.lowConfidence && <LowConfidenceTag />}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-pale-sky pt-3">
        <span className="text-xs text-regal-navy/50">
          {strings.networks.reviewStatus}
        </span>
        <NetworkStatusPill status={network.reviewStatus} />
      </div>
    </Card>
  );
}
