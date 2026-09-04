"use client";

import Link from "next/link";
import { Network } from "lucide-react";
import type { CoordinatedNetworkBadge } from "@/types/claim";
import type { NetworkReviewStatus } from "@/types/network";
import { strings } from "@/lib/constants/strings";
import {
  CONFIDENCE_MAP,
  NETWORK_STATUS_MAP,
} from "@/lib/constants/networkStatuses";
import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Cross-link from a claim into its coordinated-network detail page.
 *
 * This changes whether the team publicly rebuts a claim or refers it instead:
 * rebutting a claim that only forty accounts are actually making hands it the
 * reach it was engineered to obtain.
 *
 * Both components render nothing when `badge` is absent. There is no empty
 * state by design — a claim with no qualifying network and a deployment with
 * no detector at all look identical here, and both are correct, because in
 * both cases there is nothing to show.
 */

/** The small triage icon on the claim card. */
export function CoordinatedNetworkIcon({
  badge,
}: {
  badge: CoordinatedNetworkBadge | null;
}) {
  if (!badge) return null;

  const band = CONFIDENCE_MAP[badge.confidenceBand];
  const status = NETWORK_STATUS_MAP[badge.reviewStatus as NetworkReviewStatus];

  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full bg-danger-soft text-danger"
      // Band and review status are separate axes and are both named here:
      // "Unreviewed, Medium" must not read the same as "Confirmed, High".
      title={`${strings.networks.detectedOnClaim} — ${band.label}, ${
        status?.label ?? badge.reviewStatus
      }, ${badge.accountCount} accounts`}
      aria-label={strings.networks.detectedOnClaim}
    >
      <Network className="size-3.5" aria-hidden />
    </span>
  );
}

/** The full indicator on the existing-claim detail page. */
export function CoordinatedNetworkPanel({
  badge,
}: {
  badge: CoordinatedNetworkBadge | null;
}) {
  if (!badge) return null;

  const status = NETWORK_STATUS_MAP[badge.reviewStatus as NetworkReviewStatus];

  return (
    <Card className="space-y-3 border-danger/40 bg-danger-soft/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Network className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div>
            <h2 className="text-h3 text-regal-navy">
              {strings.networks.detectedOnClaim}
            </h2>
            <p className="mt-0.5 text-sm text-regal-navy/70">{badge.label}</p>
          </div>
        </div>
        <ScoreBadge
          score={badge.coordinationScore}
          size="md"
          showScale
          label={strings.networks.coordinationScore}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={CONFIDENCE_MAP[badge.confidenceBand].tone}>
          {CONFIDENCE_MAP[badge.confidenceBand].label}
        </StatusPill>
        {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
        <StatusPill tone="muted">
          {badge.accountCount.toLocaleString()} {strings.networks.accounts}
        </StatusPill>
        {badge.otherCount > 0 && (
          <StatusPill tone="muted">
            +{badge.otherCount} {strings.networks.othersQualify}
          </StatusPill>
        )}
      </div>

      <p className="text-xs text-regal-navy/70">
        {strings.networks.detectedOnClaimHint}
      </p>

      <Link
        href={`/coordinated-network/${badge.networkId}`}
        className="inline-flex items-center gap-1 text-sm font-bold text-sea-green hover:underline"
      >
        {strings.networks.viewNetwork} →
      </Link>
    </Card>
  );
}
