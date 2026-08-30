"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { CLAIM_STATUS_MAP } from "@/lib/constants/statuses";
import { useSyntheticClaim } from "@/lib/hooks/useClaims";
import { BackLink } from "@/components/ui/BackLink";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClaimStatusControl } from "@/components/claims/ClaimStatusControl";
import { CopyableContentBox } from "@/components/claims/CopyableContentBox";
import { CorrelatedPolicies } from "@/components/claims/CorrelatedPolicies";

/** F1 — Non-Existing/Synthetic claim detail page (PRD US20). */
export default function SyntheticClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: claim, isPending, isError } = useSyntheticClaim(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-sea-green" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !claim) {
    return (
      <div className="space-y-4">
        <BackLink href="/claims" label={strings.claims.pageTitle} />
        <EmptyState title={strings.errors.notFound} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/claims" label={strings.claims.pageTitle} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="neutral">{strings.claims.syntheticTag}</StatusPill>
          <StatusPill tone="muted">{claim.topicLabel}</StatusPill>
        </div>
        <h1 className="text-h1">{claim.statement}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-pale-sky bg-white p-4">
        <span className="text-sm font-bold text-regal-navy">
          {strings.claims.claimStatus}
        </span>
        <StatusPill tone={CLAIM_STATUS_MAP[claim.status].tone}>
          {CLAIM_STATUS_MAP[claim.status].label}
        </StatusPill>
        <ClaimStatusControl claimId={claim.id} value={claim.status} size="md" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CopyableContentBox
            title={strings.claims.prebunkActivity}
            content={claim.prebunkContent}
          />
        </div>
        <aside>
          <CorrelatedPolicies
            title={strings.claims.correlatedPolicy}
            policies={claim.correlatedPolicy ? [claim.correlatedPolicy] : []}
          />
        </aside>
      </div>
    </div>
  );
}
