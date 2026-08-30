"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, MinusCircle, PlusCircle } from "lucide-react";
import type { GenericClaim, SyntheticClaim } from "@/types/claim";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ClaimStatusControl } from "./ClaimStatusControl";
import { BellButton } from "./BellButton";

export interface ClaimCardProps {
  claim: GenericClaim | SyntheticClaim;
}

/**
 * The single claim-card component (PRD US10 / US18). Reused unmodified on the
 * F1 sections, the "See all" lists, and the F2 policy detail page (US39).
 * `variant` is derived from `claim.type` — no policy-specific variant exists.
 */
export function ClaimCard({ claim }: ClaimCardProps) {
  const router = useRouter();
  const isGeneric = claim.type === "generic";
  const href = isGeneric ? `/claims/${claim.id}` : `/predicted/${claim.id}`;

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
      <div className="flex items-start justify-between gap-2">
        <StatusPill tone={isGeneric ? "info" : "neutral"}>
          {isGeneric ? strings.claims.genericTag : strings.claims.syntheticTag}
        </StatusPill>
        <div className="flex items-center gap-1.5">
          {isGeneric && <ScoreBadge score={(claim as GenericClaim).score.finalClaimScore} size="sm" />}
          {isGeneric && (
            <BellButton
              claimId={claim.id}
              claimStatement={claim.statement}
              onWatchlist={(claim as GenericClaim).onWatchlist}
            />
          )}
        </div>
      </div>

      <p className="line-clamp-3 flex-1 text-sm font-bold text-regal-navy">
        {claim.statement}
      </p>

      <p className="text-xs text-regal-navy/60">{claim.topicLabel}</p>

      {isGeneric && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-regal-navy/60">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden />
            {strings.claims.firstCaught}: {formatDate((claim as GenericClaim).firstCaughtAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-danger">
            <MinusCircle className="size-3.5" aria-hidden />
            {(claim as GenericClaim).negativeCount}
          </span>
          <span className="inline-flex items-center gap-1 text-sea-green">
            <PlusCircle className="size-3.5" aria-hidden />
            {(claim as GenericClaim).positiveCount}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-pale-sky pt-3">
        <span className="text-xs text-regal-navy/50">
          {strings.claims.claimStatus}
        </span>
        <ClaimStatusControl claimId={claim.id} value={claim.status} />
      </div>
    </Card>
  );
}
