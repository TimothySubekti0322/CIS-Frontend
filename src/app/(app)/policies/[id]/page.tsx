"use client";

import { use } from "react";
import { Download, Loader2 } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { formatDate, formatMonthYear } from "@/lib/utils";
import { usePolicy, useMatchmakingStatus } from "@/lib/hooks/usePolicies";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { ClaimGrid } from "@/components/claims/ClaimGrid";
import { PolicyStatusPill } from "@/components/policies/PolicyStatusPill";
import { ProcessingBadge } from "@/components/policies/ProcessingBadge";

/** F2 — Public Policy detail page (PRD US39). Reuses the F1 claim cards verbatim. */
export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: policy, isPending, isError } = usePolicy(id);
  const { toast } = useToast();
  const isProcessing = policy?.processing === "processing";
  useMatchmakingStatus(id, Boolean(isProcessing));

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-sea-green" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="space-y-4">
        <BackLink href="/policies" label={strings.policies.pageTitle} />
        <EmptyState title={strings.errors.notFound} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/policies" label={strings.policies.pageTitle} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isProcessing ? (
              <ProcessingBadge />
            ) : (
              <PolicyStatusPill status={policy.status} />
            )}
            <StatusPill tone="muted">
              {formatMonthYear(policy.rolledOutDate)}
            </StatusPill>
            <span className="text-xs text-regal-navy/50">
              {strings.claims.created}: {formatDate(policy.createdAt)}
            </span>
          </div>
          <h1 className="text-h1">{policy.name}</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => toast(`Downloading ${policy.fileName}`)}
        >
          <Download className="size-4" aria-hidden />
          {strings.common.download}
        </Button>
      </div>

      {isProcessing && (
        <div className="rounded-xl border border-gold bg-gold-soft p-4 text-sm text-regal-navy">
          {strings.policies.processingHint}
        </div>
      )}

      {/* Two claim lists — side by side on desktop, stacked full-width below tablet (PRD §5.2). */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-h2">{strings.policies.exposureGeneric}</h2>
          {policy.genericClaims.length === 0 ? (
            <EmptyState title={strings.policies.noGeneric} />
          ) : (
            <ClaimGrid claims={policy.genericClaims} density="compact" />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-h2">{strings.policies.exposureSynthetic}</h2>
          {policy.syntheticClaims.length === 0 ? (
            <EmptyState title={strings.policies.noSynthetic} />
          ) : (
            <ClaimGrid claims={policy.syntheticClaims} density="compact" />
          )}
        </section>
      </div>
    </div>
  );
}
