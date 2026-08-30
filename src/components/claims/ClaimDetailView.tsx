"use client";

import { Loader2 } from "lucide-react";
import type { ClaimDetail } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { CLAIM_STATUS_MAP } from "@/lib/constants/statuses";
import { useClaim } from "@/lib/hooks/useClaims";
import { BackLink } from "@/components/ui/BackLink";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ClaimStatusControl } from "./ClaimStatusControl";
import { BellButton } from "./BellButton";
import { ScoreBreakdownPanel } from "./ScoreBreakdownPanel";
import { ScoreHistoryCard } from "./ScoreHistoryCard";
import { TopAccountsPanel } from "./TopAccountsPanel";
import { CopyableContentBox } from "./CopyableContentBox";
import { StatementList } from "./StatementList";
import { CorrelatedPolicies } from "./CorrelatedPolicies";

/**
 * Claim detail. The backend serves both types from one route
 * (`GET /claims/:id`), so this component renders from `claimType` rather than
 * the URL — a link to the "wrong" route still shows the right page.
 */
export function ClaimDetailView({ id }: { id: string }) {
  const { data: claim, isPending, isError } = useClaim(id);

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

  return claim.claimType === "existing" ? (
    <ExistingClaim claim={claim} />
  ) : (
    <SyntheticClaim claim={claim} />
  );
}

function ClaimHeader({
  claim,
  children,
}: {
  claim: ClaimDetail;
  children?: React.ReactNode;
}) {
  const isExisting = claim.claimType === "existing";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={isExisting ? "info" : "neutral"}>
            {isExisting ? strings.claims.genericTag : strings.claims.syntheticTag}
          </StatusPill>
          {claim.topic && <StatusPill tone="muted">{claim.topic.name}</StatusPill>}
          {claim.isDormant && (
            <StatusPill tone="neutral">{strings.claims.dormant}</StatusPill>
          )}
          {claim.finalClaimScore !== null && (
            <ScoreBadge score={claim.finalClaimScore} size="sm" showScale />
          )}
        </div>
        <h1 className="text-h1">{claim.claimStatement}</h1>
      </div>
      {children}
    </div>
  );
}

function StatusBar({ claim }: { claim: ClaimDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-pale-sky bg-white p-4">
      <span className="text-sm font-bold text-regal-navy">
        {strings.claims.claimStatus}
      </span>
      <StatusPill tone={CLAIM_STATUS_MAP[claim.reviewStatus].tone}>
        {CLAIM_STATUS_MAP[claim.reviewStatus].label}
      </StatusPill>
      <ClaimStatusControl claimId={claim.id} value={claim.reviewStatus} size="md" />
    </div>
  );
}

function ExistingClaim({ claim }: { claim: ClaimDetail }) {
  return (
    <div className="space-y-6">
      <BackLink href="/claims" label={strings.claims.pageTitle} />

      <ClaimHeader claim={claim}>
        <BellButton
          claimId={claim.id}
          claimStatement={claim.claimStatement}
          onWatchlist={claim.isOnAlert}
          className="size-10"
        />
      </ClaimHeader>

      <StatusBar claim={claim} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {claim.scoreBreakdown && (
            <ScoreBreakdownPanel score={claim.scoreBreakdown} />
          )}

          <ScoreHistoryCard claimId={claim.id} />

          <CopyableContentBox
            title={strings.claims.debunkActivity}
            content={claim.activity?.available ? claim.activity.content : null}
            emptyLabel={strings.claims.activityUnavailable}
            generatedAt={claim.activity?.generatedAt ?? null}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <StatementList
              claimId={claim.id}
              title={strings.claims.negativeStatements}
              stance="negative"
              total={claim.negativeStatementCount}
            />
            <StatementList
              claimId={claim.id}
              title={strings.claims.positiveStatements}
              stance="positive"
              total={claim.positiveStatementCount}
            />
          </div>
        </div>

        <aside className="space-y-6">
          <TopAccountsPanel accounts={claim.topAccounts} />
          <CorrelatedPolicies
            title={strings.claims.correlatedPolicies}
            policies={claim.policies}
          />
        </aside>
      </div>
    </div>
  );
}

function SyntheticClaim({ claim }: { claim: ClaimDetail }) {
  return (
    <div className="space-y-6">
      <BackLink href="/claims" label={strings.claims.pageTitle} />

      <ClaimHeader claim={claim} />

      <StatusBar claim={claim} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CopyableContentBox
            title={strings.claims.prebunkActivity}
            content={claim.activity?.available ? claim.activity.content : null}
            emptyLabel={strings.claims.activityUnavailable}
            generatedAt={claim.activity?.generatedAt ?? null}
          />
          <p className="rounded-xl border border-dashed border-pale-sky bg-white/60 p-4 text-sm text-regal-navy/60">
            {strings.claims.syntheticNotScored}
          </p>
        </div>
        <aside>
          <CorrelatedPolicies
            title={
              claim.policies.length > 1
                ? strings.claims.correlatedPolicies
                : strings.claims.correlatedPolicy
            }
            policies={claim.policies}
          />
        </aside>
      </div>
    </div>
  );
}
