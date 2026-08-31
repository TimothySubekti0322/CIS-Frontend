"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  Info,
  Loader2,
  Users,
} from "lucide-react";
import type { NetworkDetail } from "@/types/network";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  useNetwork,
  useNetworkContent,
  useNetworkGraph,
  useNetworkTimeline,
} from "@/lib/hooks/useNetworks";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { AccountAnnex } from "./AccountAnnex";
import { AccountDrawer } from "./AccountDrawer";
import { BurstTimelineChart } from "./BurstTimelineChart";
import { ContentClusters } from "./ContentClusters";
import { DetectorUnavailable, isDetectorUnavailable } from "./DetectorUnavailable";
import { NetworkGraphView } from "./NetworkGraphView";
import {
  CappedPill,
  ConfidencePill,
  LowConfidenceTag,
  NetworkStatusPill,
  SignalBreadthPill,
  TruncatedRunPill,
} from "./NetworkPills";
import { NetworkReviewPanel } from "./NetworkReviewPanel";
import { ReportsPanel } from "./ReportsPanel";
import { ClaimLink, WhyFlaggedPanel } from "./WhyFlaggedPanel";

/** [S4] — US49/US50. Everything needed to assess one network in one place. */
export function NetworkDetailView({ id }: { id: string }) {
  const { data: network, isPending, error } = useNetwork(id);
  const [openAccount, setOpenAccount] = useState<string | null>(null);

  // The three evidence surfaces are separate calls: each is large, and a
  // network can be triaged from the header and the signal panel alone.
  const graph = useNetworkGraph(id, Boolean(network));
  const timeline = useNetworkTimeline(id, Boolean(network));
  const content = useNetworkContent(id, Boolean(network));

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-sea-green" aria-label="Loading" />
      </div>
    );
  }

  if (isDetectorUnavailable(error)) {
    return <DetectorUnavailable error={error} />;
  }

  if (error || !network) {
    return (
      <div className="space-y-4">
        <BackLink href="/coordinated-network" label={strings.networks.pageTitle} />
        <EmptyState title={strings.errors.notFound} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/coordinated-network" label={strings.networks.pageTitle} />

      <Header network={network} />

      {/* PRD 10.9.2's standing text, served rather than hard-coded so the page
          and the PDF cannot drift apart. */}
      {network.disclaimer && (
        <Card className="border-glaucous bg-white">
          <p className="flex items-start gap-2 text-xs text-regal-navy/80">
            <Info className="mt-0.5 size-4 shrink-0 text-glaucous" aria-hidden />
            <span>
              <span className="font-bold">{strings.networks.disclaimerTitle}: </span>
              {network.disclaimer}
            </span>
          </p>
        </Card>
      )}

      <NetworkReviewPanel network={network} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <WhyFlaggedPanel why={network.whyFlagged} />
          <NetworkGraphView
            graph={graph.data}
            isPending={graph.isPending}
            onSelectAccount={setOpenAccount}
          />
          <BurstTimelineChart
            timeline={timeline.data}
            isPending={timeline.isPending}
          />
          <ContentClusters content={content.data} isPending={content.isPending} />
          <AccountAnnex networkId={network.id} onSelectAccount={setOpenAccount} />
        </div>

        <aside className="space-y-6">
          <RunPanel network={network} />
          <LinkedPanel network={network} />
          <ReportsPanel network={network} />
        </aside>
      </div>

      <AccountDrawer
        networkId={network.id}
        accountId={openAccount}
        onClose={() => setOpenAccount(null)}
      />
    </div>
  );
}

function Header({ network }: { network: NetworkDetail }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidencePill band={network.confidenceBand} />
        <SignalBreadthPill breadth={network.signalBreadth} />
        <NetworkStatusPill status={network.reviewStatus} />
        {network.fromTruncatedRun && (
          <TruncatedRunPill note={network.run.truncationNote} />
        )}
        {network.run.confidenceCappedAtMedium && <CappedPill />}
        {network.lowConfidence && <LowConfidenceTag />}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-h1">{network.label}</h1>
        <ScoreBadge
          score={network.coordinationScore}
          size="lg"
          showScale
          label={strings.networks.coordinationScore}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-regal-navy/60">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" aria-hidden />
          {network.accountCount.toLocaleString()} {strings.networks.accounts}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText className="size-4" aria-hidden />
          {network.postCount.toLocaleString()} {strings.networks.posts}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4" aria-hidden />
          {strings.networks.detected} {formatDateTime(network.detectedAt)}
        </span>
        {network.platforms.length > 0 && (
          <span>
            {strings.networks.platforms}: {network.platforms.join(", ")}
          </span>
        )}
      </div>

      {/* Rendered verbatim so a client that forgot to check the boolean cannot
          drop the caveat. */}
      {network.run.truncated && network.run.truncationNote && (
        <p className="flex items-start gap-2 rounded-lg border border-gold bg-gold-soft px-3 py-2 text-xs text-regal-navy">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {network.run.truncationNote}
        </p>
      )}
    </div>
  );
}

/**
 * Run context. A truncated candidate set and unavailable signal families are
 * what answer "why is everything Medium this week?", which is a question about
 * runs rather than about this network.
 */
function RunPanel({ network }: { network: NetworkDetail }) {
  const { run } = network;
  return (
    <Card className="space-y-2">
      <h2 className="text-h3">{strings.networks.detectionRun}</h2>
      <dl className="space-y-1.5 text-xs">
        <Row label={strings.networks.trigger} value={run.triggerSource || "—"} />
        <Row
          label={strings.networks.detectionWindow}
          value={`${formatDateTime(run.windowStart)} — ${formatDateTime(run.windowEnd)}`}
        />
        <Row
          label={strings.networks.candidates}
          value={run.candidatesCount.toLocaleString()}
        />
        {run.signalsUnavailable.length > 0 && (
          <Row
            label={strings.networks.signalsUnavailable}
            value={run.signalsUnavailable.join(", ")}
          />
        )}
      </dl>
      {run.runId && (
        <p className="break-all font-mono text-[11px] text-regal-navy/40">
          {run.runId}
        </p>
      )}
      {network.recurrence.priorClaims.length > 0 && (
        <div className="border-t border-pale-sky pt-2">
          <p className="text-xs font-bold text-regal-navy">
            Prior detections in this chain
          </p>
          <ul className="mt-1 space-y-1">
            {network.recurrence.priorClaims.map((prior) => (
              <li key={prior.networkId} className="text-xs">
                <Link
                  href={`/coordinated-network/${prior.networkId}`}
                  className="text-sea-green hover:underline"
                >
                  {prior.label}
                </Link>
                <span className="ml-1 text-regal-navy/50">
                  {formatDateTime(prior.detectedAt)}
                </span>
                {prior.claimStatement && (
                  <span className="block text-regal-navy/60">
                    {prior.claimStatement}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Linked claims and policies navigate to F1/F2 — F5 builds no claim UI. */
function LinkedPanel({ network }: { network: NetworkDetail }) {
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-h3">{strings.networks.linkedClaims}</h2>
        <div className="mt-2 space-y-1.5">
          {network.linkedClaims.length === 0 ? (
            <p className="text-xs text-regal-navy/60">—</p>
          ) : (
            network.linkedClaims.map((claim) => (
              <ClaimLink key={claim.claimId} claim={claim} />
            ))
          )}
        </div>
      </div>

      <div className="border-t border-pale-sky pt-3">
        <h2 className="text-h3">{strings.networks.linkedPolicies}</h2>
        <div className="mt-2 space-y-1.5">
          {network.linkedPolicies.length === 0 ? (
            <p className="text-xs text-regal-navy/60">
              {strings.networks.noLinkedPolicies}
            </p>
          ) : (
            network.linkedPolicies.map((policy) => (
              <Link
                key={policy.id}
                href={`/policies/${policy.id}`}
                className="block rounded-lg border border-pale-sky bg-white px-3 py-2 text-xs text-regal-navy transition-colors hover:border-sea-green hover:text-sea-green"
              >
                {policy.name}
                {policy.status && (
                  <StatusPill
                    tone={policy.status === "rolled_out" ? "success" : "neutral"}
                    className="ml-2"
                  >
                    {policy.status === "rolled_out"
                      ? strings.policies.rolledOut
                      : strings.policies.notRolledOut}
                  </StatusPill>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-regal-navy/60">{label}</dt>
      <dd className="text-right font-bold text-regal-navy">{value}</dd>
    </div>
  );
}
