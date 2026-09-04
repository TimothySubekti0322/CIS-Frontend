"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, MinusCircle, PlusCircle } from "lucide-react";
import type { ClaimSummary } from "@/types/claim";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ClaimStatusControl } from "./ClaimStatusControl";
import { BellButton } from "./BellButton";
import { CoordinatedNetworkIcon } from "./CoordinatedNetworkLink";

export interface ClaimCardProps {
  claim: ClaimSummary;
}

/**
 * The single claim-card component, reused unmodified across claim listings
 * and the policy detail page. The variant is derived from `claimType` —
 * there is no policy-specific card.
 *
 * A Synthetic claim carries no score, dates, statement counts or bell state:
 * those fields are absent, not zero, so nothing is rendered for them.
 */
export function ClaimCard({ claim }: ClaimCardProps) {
  const router = useRouter();
  const isExisting = claim.claimType === "existing";
  const href = isExisting ? `/claims/${claim.id}` : `/predicted/${claim.id}`;

  return (
    <Card
      interactive
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="flex h-full flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusPill tone={isExisting ? "info" : "neutral"}>
          {isExisting ? strings.claims.genericTag : strings.claims.syntheticTag}
        </StatusPill>
        <div className="flex items-center gap-1.5">
          {/* Visible during triage without opening the claim. Part of the
              shared card, so it appears on the policy detail page too. */}
          <CoordinatedNetworkIcon badge={claim.coordinatedNetwork} />
          {claim.finalClaimScore !== null && (
            <ScoreBadge score={claim.finalClaimScore} size="sm" />
          )}
          {claim.isDormant && (
            <StatusPill tone="neutral">{strings.claims.dormant}</StatusPill>
          )}
          {isExisting && (
            <BellButton
              claimId={claim.id}
              claimStatement={claim.claimStatement}
              onWatchlist={claim.isOnAlert}
            />
          )}
        </div>
      </div>

      <p className="line-clamp-3 flex-1 text-sm font-bold text-regal-navy">
        {claim.claimStatement}
      </p>

      {claim.topic && (
        <p className="text-xs text-regal-navy/60">{claim.topic.name}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-regal-navy/60">
        {/* Two different dates: an Existing claim shows when the AI first
            caught it in the wild; a Synthetic one shows when it was predicted. */}
        {(isExisting ? claim.firstCaughtAt : claim.createdAt) && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden />
            {isExisting ? strings.claims.firstCaught : strings.claims.created}:{" "}
            {formatDate(isExisting ? claim.firstCaughtAt : claim.createdAt)}
          </span>
        )}
        {claim.negativeStatementCount !== null && (
          <span className="inline-flex items-center gap-1 text-danger">
            <MinusCircle className="size-3.5" aria-hidden />
            {claim.negativeStatementCount.toLocaleString()}
          </span>
        )}
        {claim.positiveStatementCount !== null && (
          <span className="inline-flex items-center gap-1 text-sea-green">
            <PlusCircle className="size-3.5" aria-hidden />
            {claim.positiveStatementCount.toLocaleString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-pale-sky pt-3">
        <span className="text-xs text-regal-navy/50">
          {strings.claims.claimStatus}
        </span>
        <ClaimStatusControl claimId={claim.id} value={claim.reviewStatus} />
      </div>
    </Card>
  );
}
