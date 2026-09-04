"use client";

import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import type { NetworkDetail } from "@/types/network";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { CONFIDENCE_MAP } from "@/lib/constants/networkStatuses";
import {
  useNetwork,
  useNetworkContent,
  useNetworkGraph,
} from "@/lib/hooks/useNetworks";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { AccountAnnex } from "./AccountAnnex";
import { AccountDrawer } from "./AccountDrawer";
import { ClaimRelevanceGrid, DetBlock, SignalProfile } from "./ClusterSections";
import { ContentClusters } from "./ContentClusters";
import { DetectorUnavailable, isDetectorUnavailable } from "./DetectorUnavailable";
import { NetworkGraphView } from "./NetworkGraphView";
import {
  CappedPill,
  LowConfidenceTag,
  NetworkStatusPill,
  TruncatedRunPill,
} from "./NetworkPills";
import { NetworkReportView } from "./NetworkReportView";
import { AllowlistNetworkDialog, NetworkReviewBar } from "./NetworkReviewPanel";
import { NetworkActions } from "./ReportsPanel";

/**
 * One cluster, as a single sheet rather than a wall of panels.
 *
 * The page answers one question: does this cluster need a person's attention,
 * and on what evidence? So it carries the score, the five signal scores, the
 * relevance gate, the shape of the cluster, a sample of the posts, and the
 * member list — and stops there. Everything an analyst needs *after* deciding
 * that, and everything a recipient outside the team needs, lives in the report:
 * method sentences, underlying counts, the banding rule, the posting timeline,
 * run parameters and the stated limitations.
 *
 * That split is not only about density. The report is the artefact that leaves
 * the building, so it is the one that has to be complete and self-explaining;
 * the sheet is a triage surface for people who already know what conductance
 * means.
 */
export function NetworkDetailView({ id }: { id: string }) {
  const { data: network, isPending, error } = useNetwork(id);
  const [openAccount, setOpenAccount] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [allowlisting, setAllowlisting] = useState(false);

  // Both evidence surfaces on the sheet are separate calls: each is large, and
  // a cluster can be triaged from the header and the signal profile alone.
  const graph = useNetworkGraph(id, Boolean(network));
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
    <div className="space-y-5">
      <BackLink href="/coordinated-network" label={strings.networks.pageTitle} />

      <Card className="overflow-hidden p-0">
        <ClusterHeader network={network} />

        <div className="px-5 pt-5 pb-6 sm:px-6">
          <ClusterStrip network={network} />

          <NetworkReviewBar network={network} />

          <DetBlock
            heading={strings.networks.signalProfile}
            note={strings.networks.signalProfileNote}
          >
            <SignalProfile why={network.whyFlagged} />
          </DetBlock>

          {network.whyFlagged.claimRelevance.primaryClaim && (
            <DetBlock heading={strings.networks.relevanceHeading}>
              <ClaimRelevanceGrid why={network.whyFlagged} />
            </DetBlock>
          )}

          {(graph.isPending || (graph.data && graph.data.nodes.length > 0)) && (
            <DetBlock
              heading={strings.networks.shapeHeading}
              note={strings.networks.graphNote}
            >
              <NetworkGraphView
                graph={graph.data}
                isPending={graph.isPending}
                onSelectAccount={setOpenAccount}
                embedded
              />
            </DetBlock>
          )}

          <DetBlock
            heading={strings.networks.postsHeading}
            note={content.data?.note ?? strings.networks.contentNote}
          >
            <ContentClusters
              content={content.data}
              isPending={content.isPending}
              embedded
              maxPosts={4}
            />
          </DetBlock>

          <DetBlock
            heading={strings.networks.memberAccounts}
            count={network.accountCount.toLocaleString()}
            note={strings.networks.memberAccountsHint}
          >
            <AccountAnnex
              networkId={network.id}
              onSelectAccount={setOpenAccount}
              embedded
            />
          </DetBlock>

          {/* Standing text served rather than hard-coded so the sheet and the
              report cannot drift apart. */}
          {network.disclaimer && (
            <p className="mt-6 rounded-xl bg-mint-cream px-3.5 py-3 text-xs leading-relaxed text-regal-navy/70">
              <span className="font-bold text-regal-navy">
                {strings.networks.disclaimerTitle}.{" "}
              </span>
              {network.disclaimer}
            </p>
          )}

          <p className="mt-2.5 text-xs text-regal-navy/50">
            {strings.networks.detailMovedToReport}
          </p>

          <NetworkActions
            network={network}
            onPreview={() => setPreview(true)}
            onAllowlist={() => setAllowlisting(true)}
          />
        </div>
      </Card>

      <AccountDrawer
        networkId={network.id}
        accountId={openAccount}
        onClose={() => setOpenAccount(null)}
      />

      <AllowlistNetworkDialog
        network={network}
        open={allowlisting}
        onClose={() => setAllowlisting(false)}
      />

      <NetworkReportView
        network={network}
        open={preview}
        onClose={() => setPreview(false)}
      />
    </div>
  );
}

/**
 * The header band. The score sits opposite the label at the top of the page
 * because it is the first thing the reader is deciding on — and the confidence
 * band sits directly under it because the two are read together: a 90 with one
 * signal family agreeing is the shape of a mistake, not of a campaign.
 */
function ClusterHeader({ network }: { network: NetworkDetail }) {
  const claim = network.primaryClaim;
  const band = CONFIDENCE_MAP[network.confidenceBand];

  return (
    <header className="bg-regal-navy px-5 py-5 text-white sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.09em] text-frosted-blue uppercase">
            {strings.networks.clusterDetail}
          </p>
          <h1 className="mt-1.5 text-xl leading-tight font-bold sm:text-2xl">
            {network.label}
          </h1>
          {(claim || network.linkedPolicies.length > 0) && (
            <p className="mt-1.5 max-w-[68ch] text-xs leading-relaxed text-white/70">
              {claim && (
                <>
                  {strings.networks.amplifying} “{claim.claimStatement}”
                </>
              )}
              {network.linkedPolicies.length > 0 && (
                <>
                  {claim && " · "}
                  {strings.networks.policyPrefix}:{" "}
                  {network.linkedPolicies.map((p) => p.name).join(", ")}
                </>
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* A recurrence inherits history but not relevance, so the count
                and the date it starts from are both stated. */}
            {network.recurrence.isRecurrence && network.recurrence.count > 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 font-mono text-[11px] text-white">
                <History className="size-3" aria-hidden />
                {strings.networks.recurrenceSeen} {network.recurrence.count}×
                {network.recurrence.firstSeenAt && (
                  <>
                    {" "}
                    {strings.networks.recurrenceSince}{" "}
                    {formatDate(network.recurrence.firstSeenAt)}
                  </>
                )}
              </span>
            )}
            <NetworkStatusPill status={network.reviewStatus} />
            {network.fromTruncatedRun && (
              <TruncatedRunPill note={network.run.truncationNote} />
            )}
            {network.run.confidenceCappedAtMedium && <CappedPill />}
            {/* The band pill beside the score already reads "Low confidence";
                the tag only earns its place when the flag and the band
                disagree — a network the server suppressed for some other
                reason. */}
            {network.lowConfidence && network.confidenceBand !== "low" && (
              <LowConfidenceTag />
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-4xl leading-none font-bold text-frosted-blue tabular-nums">
            {network.coordinationScore.toFixed(1)}
          </p>
          <p className="mt-1.5 text-[9.5px] font-bold tracking-[0.06em] text-white/60 uppercase">
            {strings.networks.coordinationScore}
          </p>
          <StatusPill tone={band.tone} className="mt-2">
            {band.label}
          </StatusPill>
        </div>
      </div>

      {/* Rendered verbatim so a client that forgot to check the boolean cannot
          drop the caveat. */}
      {network.run.truncated && network.run.truncationNote && (
        <p className="mt-4 rounded-xl bg-gold/20 px-3.5 py-2.5 text-xs leading-relaxed text-white">
          {network.run.truncationNote}
        </p>
      )}
    </header>
  );
}

/** The four counts that frame everything below them. */
function ClusterStrip({ network }: { network: NetworkDetail }) {
  const items: { label: string; value: string }[] = [
    {
      label: strings.networks.accountsLabel,
      value: network.accountCount.toLocaleString(),
    },
    {
      label: strings.networks.postsLabel,
      value: network.postCount.toLocaleString(),
    },
    {
      label: strings.networks.windowAnalysed,
      value: `${formatDate(network.run.windowStart)} — ${formatDate(network.run.windowEnd)}`,
    },
  ];
  if (network.platforms.length > 0) {
    items.push({
      label: strings.networks.platforms,
      value: network.platforms.join(", "),
    });
  }

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3 border-b border-pale-sky pb-4">
      {items.map((item) => (
        <div key={item.label}>
          <dd className="text-[15px] font-bold text-regal-navy tabular-nums">
            {item.value}
          </dd>
          <dt className="mt-0.5 text-[11px] text-regal-navy/60">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
