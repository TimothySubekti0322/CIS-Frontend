"use client";

import { useState } from "react";
import Link from "next/link";
import type { OfftopicClusterParams } from "@/types/network";
import { cn, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { SIGNAL_LABELS } from "@/lib/constants/networkStatuses";
import {
  useDetectionRuns,
  useDismissalSummary,
  useExportAudit,
  useOfftopicClusters,
  useOfftopicRates,
} from "@/lib/hooks/useDetector";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  DetectorUnavailable,
  isDetectorUnavailable,
} from "@/components/networks/DetectorUnavailable";

/**
 * US62's read-only governance surfaces plus US64's export audit.
 *
 * All four answer questions an admin cannot answer from the network list:
 * why everything is banded Medium this week (runs), whether the relevance gate
 * is set too loose (off-topic rate), which signal is systematically
 * over-triggering (dismissals), and who shared what (export audit).
 */
export function DetectionGovernance() {
  const runs = useDetectionRuns({ limit: 10 });

  if (isDetectorUnavailable(runs.error)) {
    return <DetectorUnavailable error={runs.error} />;
  }

  return (
    <div className="space-y-6">
      <DetectionRunsCard />
      <DismissalSummaryCard />
      <OfftopicCard />
      <ExportAuditCard />
    </div>
  );
}

function DetectionRunsCard() {
  const [page, setPage] = useState(1);
  const { data, isPending } = useDetectionRuns({ page, limit: 10 });

  return (
    <Card className="space-y-3">
      <h2 className="text-h3">{strings.detector.runsTitle}</h2>
      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.detector.runsEmpty}</p>
      ) : (
        <>
          <div className="scroll-x">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-pale-sky text-left text-xs text-regal-navy/70">
                  <th className="px-2 py-2">{strings.detector.runStatus}</th>
                  <th className="px-2 py-2">{strings.detector.runTrigger}</th>
                  <th className="px-2 py-2">{strings.detector.runWindow}</th>
                  <th className="px-2 py-2 text-right">
                    {strings.detector.runNetworks}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {strings.detector.runOfftopic}
                  </th>
                  <th className="px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((run) => (
                  <tr key={run.runId} className="border-b border-pale-sky/60">
                    <td className="px-2 py-2">
                      <StatusPill
                        tone={
                          run.status === "completed"
                            ? "success"
                            : run.status === "failed"
                              ? "danger"
                              : "warn"
                        }
                      >
                        {run.status}
                      </StatusPill>
                    </td>
                    <td className="px-2 py-2">{run.triggerSource}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-regal-navy/60">
                      {formatDateTime(run.windowStart)} —{" "}
                      {formatDateTime(run.windowEnd)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {run.networkCount}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {run.offtopicCount}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {run.truncated && (
                          <StatusPill tone="warn">
                            {strings.detector.runTruncated}
                          </StatusPill>
                        )}
                        {/* Rule 4's consequence, stated — this is the answer to
                            "why is everything Medium this week?" */}
                        {run.confidenceCappedAtMedium && (
                          <StatusPill tone="muted">
                            {strings.networks.cappedAtMedium}
                          </StatusPill>
                        )}
                        {run.signalsUnavailable.length > 0 && (
                          <StatusPill tone="muted">
                            {run.signalsUnavailable
                              .map((c) => SIGNAL_LABELS[c] ?? c)
                              .join(", ")}
                          </StatusPill>
                        )}
                        {run.error && (
                          <span className="text-danger">{run.error}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}

/**
 * PRD 10.9.3's aggregate. Precision is deliberately the headline and recall is
 * secondary: a missed network costs a missed referral; a false positive costs a
 * government publicly implying that residents are bots.
 */
function DismissalSummaryCard() {
  const { data, isPending } = useDismissalSummary(90);

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-h3">{strings.detector.dismissalsTitle}</h2>
        <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
          {strings.detector.dismissalsDescription}
        </p>
      </div>

      {isPending || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={strings.networkStatus.confirmed} value={data.confirmed} />
            <Stat
              label={strings.networkStatus.action_taken}
              value={data.actionTaken}
            />
            <Stat
              label={strings.networkStatus.dismissed_false_positive}
              value={data.dismissed}
            />
            <div>
              <p className="text-xs text-regal-navy/60">
                {strings.detector.precision}
              </p>
              {data.precision === null ? (
                <p className="text-sm text-regal-navy/60">—</p>
              ) : (
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    data.meetsTarget ? "text-sea-green" : "text-danger",
                  )}
                >
                  {(data.precision * 100).toFixed(1)}%
                  <span className="ml-1 text-xs font-normal text-regal-navy/50">
                    ({strings.detector.precisionTarget}{" "}
                    {(data.precisionTarget * 100).toFixed(0)}%)
                  </span>
                </p>
              )}
            </div>
          </div>

          {data.precision === null && (
            <p className="text-xs text-regal-navy/60">
              {strings.detector.precisionUnavailable}
            </p>
          )}

          {data.meanSignalScores &&
            Object.keys(data.meanSignalScores).length > 0 && (
              <div>
                <p className="text-xs font-bold text-regal-navy">
                  {strings.detector.meanSignals}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(data.meanSignalScores).map(([code, value]) => (
                    <span key={code} className="text-xs text-regal-navy/70">
                      {SIGNAL_LABELS[code] ?? code}{" "}
                      <span className="font-bold tabular-nums">
                        {value.toFixed(1)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          <p className="text-xs text-regal-navy/50">
            {strings.detector.sampleSize}: {data.sampleSize} ·{" "}
            {strings.detector.windowDays}: {data.windowDays} days
            {data.note ? ` · ${data.note}` : ""}
          </p>
        </>
      )}
    </Card>
  );
}

/**
 * Off-topic clusters: genuinely coordinated, but not about a tracked climate
 * claim. They must never appear in a climate report; they are kept only so a
 * rising rate can be seen and the gate recalibrated.
 */
function OfftopicCard() {
  const [failedTest, setFailedTest] =
    useState<OfftopicClusterParams["failedTest"]>(undefined);
  const [page, setPage] = useState(1);
  const { data, isPending } = useOfftopicClusters({ failedTest, page, limit: 10 });
  const rates = useOfftopicRates();

  const latest = rates.data?.[0];

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3">{strings.detector.offtopicTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
            {strings.detector.offtopicDescription}
          </p>
        </div>
        {latest && (
          <div className="text-right">
            <p className="text-xs text-regal-navy/60">
              {strings.detector.offtopicRate}
            </p>
            <p className="text-sm font-bold tabular-nums text-regal-navy">
              {(latest.rate * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <select
        value={failedTest ?? ""}
        onChange={(e) => {
          setFailedTest(
            (e.target.value || undefined) as OfftopicClusterParams["failedTest"],
          );
          setPage(1);
        }}
        className="h-10 max-w-56 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
        aria-label={strings.detector.offtopicFailedTest}
      >
        <option value="">{strings.common.allStatus}</option>
        <option value="anchoring">Anchoring</option>
        <option value="evidence_volume">Evidence volume</option>
        <option value="link_strength">Link strength</option>
      </select>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.detector.offtopicEmpty}</p>
      ) : (
        <>
          <div className="scroll-x">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-pale-sky text-left text-xs text-regal-navy/70">
                  <th className="px-2 py-2">{strings.detector.offtopicFailedTest}</th>
                  <th className="px-2 py-2">Claim</th>
                  <th className="px-2 py-2 text-right">
                    {strings.networks.overlapRatio}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {strings.networks.anchoringShare}
                  </th>
                  <th className="px-2 py-2 text-right">Accounts</th>
                  <th className="px-2 py-2 text-right">Posts</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((cluster) => (
                  <tr key={cluster.clusterId} className="border-b border-pale-sky/60">
                    <td className="px-2 py-2">
                      <StatusPill tone="muted">{cluster.failedTest}</StatusPill>
                    </td>
                    <td className="max-w-xs px-2 py-2 text-xs text-regal-navy/70">
                      {cluster.claimStatement ?? cluster.claimId}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {cluster.overlapRatio.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {cluster.anchoringShare.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {cluster.accountCount}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {cluster.postCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}

/** US64 — who exported what, when, with which sections and redaction. */
function ExportAuditCard() {
  const [page, setPage] = useState(1);
  const { data, isPending } = useExportAudit({ page, limit: 10 });

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-h3">{strings.detector.auditTitle}</h2>
        <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
          {strings.detector.auditDescription}
        </p>
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.detector.auditEmpty}</p>
      ) : (
        <>
          <div className="scroll-x">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-pale-sky text-left text-xs text-regal-navy/70">
                  <th className="px-2 py-2">{strings.detector.colExportType}</th>
                  <th className="px-2 py-2">{strings.detector.colNetwork}</th>
                  <th className="px-2 py-2">{strings.detector.colUser}</th>
                  <th className="px-2 py-2">{strings.detector.colWhen}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-pale-sky/60">
                    <td className="px-2 py-2">
                      <StatusPill tone="info">{entry.exportType}</StatusPill>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <Link
                        href={`/coordinated-network/${entry.networkId}`}
                        className="text-sea-green hover:underline"
                      >
                        {entry.networkId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {entry.userName ?? entry.userId ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-regal-navy/60">
                      {formatDateTime(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-regal-navy/60">{label}</p>
      <p className="text-sm font-bold tabular-nums text-regal-navy">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
