"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { CLAIM_STATUS_MAP } from "@/lib/constants/statuses";
import { useGenericClaim } from "@/lib/hooks/useClaims";
import { BackLink } from "@/components/ui/BackLink";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClaimStatusControl } from "@/components/claims/ClaimStatusControl";
import { BellButton } from "@/components/claims/BellButton";
import { ScoreBreakdownPanel } from "@/components/claims/ScoreBreakdownPanel";
import { TopAccountsPanel } from "@/components/claims/TopAccountsPanel";
import { CopyableContentBox } from "@/components/claims/CopyableContentBox";
import { StatementList } from "@/components/claims/StatementList";
import { CorrelatedPolicies } from "@/components/claims/CorrelatedPolicies";

/** F1 — Existing/Generic claim detail page (PRD US12, US23–US25). */
export default function GenericClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: claim, isPending, isError } = useGenericClaim(id);

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="info">{strings.claims.genericTag}</StatusPill>
            <StatusPill tone="muted">{claim.topicLabel}</StatusPill>
          </div>
          <h1 className="text-h1">{claim.statement}</h1>
        </div>
        <BellButton
          claimId={claim.id}
          claimStatement={claim.statement}
          onWatchlist={claim.onWatchlist}
          className="size-10"
        />
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

      {/* Two-column layout (PRD §5.5); stacks below the lg breakpoint (§5.2). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ScoreBreakdownPanel score={claim.score} />
          <CopyableContentBox
            title={strings.claims.debunkActivity}
            content={claim.debunkContent}
          />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <StatementList
              title={strings.claims.negativeStatements}
              total={claim.negativeCount}
              statements={claim.negativeStatements}
              sentiment="negative"
            />
            <StatementList
              title={strings.claims.positiveStatements}
              total={claim.positiveCount}
              statements={claim.positiveStatements}
              sentiment="positive"
            />
          </div>
        </div>

        <aside className="space-y-6">
          <TopAccountsPanel accounts={claim.topAccounts} />
          <CorrelatedPolicies
            title={strings.claims.correlatedPolicies}
            policies={claim.correlatedPolicies}
          />
        </aside>
      </div>
    </div>
  );
}
