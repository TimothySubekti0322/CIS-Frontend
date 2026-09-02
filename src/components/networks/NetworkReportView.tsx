"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, X } from "lucide-react";
import type {
  AccountAnnexRow,
  BurstTimeline,
  NetworkDetail,
  NetworkReviewLogEntry,
  RepresentativeContent,
  ReportType,
  SignalDetail,
} from "@/types/network";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { SIGNAL_LABELS, SIGNAL_ORDER } from "@/lib/constants/networkStatuses";
import {
  useNetwork,
  useNetworkAccounts,
  useNetworkContent,
  useNetworkGraph,
  useNetworkReports,
  useNetworkReviewLog,
  useNetworkTimeline,
} from "@/lib/hooks/useNetworks";
import { useDetectionRun } from "@/lib/hooks/useDetector";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { NetworkGraphView } from "./NetworkGraphView";
import { NetworkStatusPill } from "./NetworkPills";
import { formatValue, humanise } from "./format";

/**
 * The report, as it will read on paper.
 *
 * The cluster sheet answers "does this need my attention?"; this answers
 * "what exactly was measured, and what does it not establish?" — which is the
 * document that leaves the building, so it is the one that has to be complete.
 * Everything the sheet drops (method sentences, underlying counts, the banding
 * rule, the posting timeline, run parameters, stated limitations) is here.
 *
 * Every section is conditional on its data actually existing. A report is an
 * accusation with a city's name on it; a section rendered from a placeholder
 * would be a fabricated measurement, so an absent measurement is absent here.
 */
export function NetworkReportView({
  network,
  open,
  onClose,
}: {
  network: NetworkDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [reportType, setReportType] = useState<ReportType>("platform_referral");
  const internal = reportType === "internal_briefing";

  // Everything is fetched only once the preview is actually opened — the sheet
  // behind it already paid for the calls it needs.
  const id = network.id;
  const graph = useNetworkGraph(id, open);
  const timeline = useNetworkTimeline(id, open);
  const content = useNetworkContent(id, open);
  const accounts = useNetworkAccounts(
    id,
    { sort: "centrality", limit: 200 },
    open,
  );
  const reports = useNetworkReports(id, open);
  const reviewLog = useNetworkReviewLog(id, open && internal);
  const run = useDetectionRun(open ? network.run.runId : "");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const rows = accounts.data?.items ?? [];
  const totalAccounts = accounts.data?.meta.total ?? rows.length;
  const latestReport = reports.data?.[0];

  // Section numbers have to run consecutively over whatever actually rendered,
  // so they are drawn from a counter rather than written into the markup.
  let section = 0;
  const n = () => String(++section).padStart(2, "0");

  return (
    <div
      id="report-print-root"
      className="fixed inset-0 z-60 overflow-y-auto bg-regal-navy/85 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto w-full max-w-[860px]">
        <div className="report-chrome mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-white uppercase">
              {strings.networkReport.previewTitle}
            </span>
            <label className="sr-only" htmlFor="report-preview-type">
              {strings.networkReport.reportType}
            </label>
            <select
              id="report-preview-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="h-8 rounded-lg border border-white/30 bg-white/10 px-2 text-xs text-white focus-visible:outline-none"
            >
              <option className="text-regal-navy" value="platform_referral">
                {strings.networks.reportTypePlatform}
              </option>
              <option className="text-regal-navy" value="internal_briefing">
                {strings.networks.reportTypeInternal}
              </option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              {strings.networkReport.print}
            </Button>
            <IconButton
              label={strings.networkReport.close}
              onClick={onClose}
              className="text-white hover:bg-white/15"
            >
              <X className="size-5" aria-hidden />
            </IconButton>
          </div>
        </div>

        <article
          className="report-paper overflow-hidden rounded-2xl bg-white pb-10 shadow-xl"
          aria-label={strings.networkReport.title}
        >
          <Cover network={network} internal={internal} />

          <Sec num={n()} title={strings.networkReport.secHowToRead}>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Explainer
                title={strings.networkReport.howBehaviour}
                body={strings.networkReport.howBehaviourBody}
              />
              <Explainer
                title={strings.networkReport.howBreadth}
                body={strings.networkReport.howBreadthBody}
              />
              <Explainer
                title={strings.networkReport.howNoBots}
                body={strings.networkReport.howNoBotsBody}
              />
              <Explainer
                title={strings.networkReport.howSignedOff}
                body={strings.networkReport.howSignedOffBody}
              />
            </div>
          </Sec>

          <Sec num={n()} title={strings.networkReport.secFindings}>
            <Findings network={network} />
            <Aside title={strings.networkReport.findingsNotSaying}>
              {strings.networkReport.findingsNotSayingBody}
            </Aside>
          </Sec>

          {network.whyFlagged.signals.length > 0 && (
            <Sec num={n()} title={strings.networkReport.secSignals}>
              <P>{strings.networkReport.signalsIntro}</P>
              <Signals network={network} />
            </Sec>
          )}

          {rows.some((r) => r.createdAtPlatform) && (
            <Sec num={n()} title={strings.networkReport.secSignup}>
              <P>{strings.networkReport.signupIntro}</P>
              <SignupTimeline rows={rows} />
            </Sec>
          )}

          {network.whyFlagged.claimRelevance.primaryClaim && (
            <Sec num={n()} title={strings.networkReport.secRelevance}>
              <P>{strings.networkReport.relevanceIntro}</P>
              <Relevance network={network} />
            </Sec>
          )}

          {timeline.data && timeline.data.bins.length > 0 && (
            <Sec num={n()} title={strings.networkReport.secTimeline}>
              <P>{strings.networkReport.timelineIntro}</P>
              <Burst timeline={timeline.data} />
            </Sec>
          )}

          {graph.data && graph.data.nodes.length > 0 && (
            <Sec num={n()} title={strings.networkReport.secGraph}>
              <P>{strings.networkReport.graphIntro}</P>
              <NetworkGraphView
                graph={graph.data}
                isPending={false}
                onSelectAccount={() => {}}
                embedded
              />
              <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1">
                <Figure
                  label={strings.networks.internalDensity}
                  value={network.whyFlagged.internalDensity.toFixed(2)}
                />
                <Figure
                  label={strings.networks.conductance}
                  value={network.whyFlagged.conductance.toFixed(2)}
                />
                <Figure
                  label={strings.networks.comparisonAccounts}
                  value={network.whyFlagged.comparisonAccountCount.toLocaleString()}
                />
              </dl>
            </Sec>
          )}

          {content.data && content.data.groups.length > 0 && (
            <Sec num={n()} title={strings.networkReport.secContent}>
              <P>{content.data.note ?? strings.networkReport.contentIntro}</P>
              <DuplicateGroups content={content.data} />
            </Sec>
          )}

          {rows.length > 0 && (
            <Sec num={n()} title={strings.networkReport.secAccounts}>
              <P>{strings.networkReport.accountsIntro}</P>
              <AccountTable rows={rows} total={totalAccounts} />
            </Sec>
          )}

          {internal && (
            <Sec num={n()} title={strings.networkReport.secInternal}>
              <Internal network={network} log={reviewLog.data ?? []} />
            </Sec>
          )}

          {run.data?.parameters && Object.keys(run.data.parameters).length > 0 && (
            <Sec num={n()} title={strings.networkReport.secSettings}>
              <P>{strings.networkReport.settingsIntro}</P>
              <Params params={run.data.parameters} seed={run.data.randomSeed} />
            </Sec>
          )}

          {network.whyFlagged.knownLimitations.length > 0 && (
            <Sec num={n()} title={strings.networkReport.secLimits}>
              {network.whyFlagged.knownLimitations.map((limit, i) => (
                <P key={i}>{limit}</P>
              ))}
            </Sec>
          )}

          <Sec num={n()} title={strings.networkReport.secEvidence}>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <MonoRow
                label={strings.networkReport.evidenceRun}
                value={network.run.runId}
              />
              {latestReport?.snapshotId && (
                <MonoRow
                  label={strings.networkReport.evidenceSnapshot}
                  value={latestReport.snapshotId}
                />
              )}
              {latestReport?.snapshotSha256 && (
                <MonoRow
                  label={strings.networkReport.evidenceSnapshotHash}
                  value={latestReport.snapshotSha256}
                />
              )}
              {latestReport?.auditId && (
                <MonoRow
                  label={strings.networkReport.evidenceAudit}
                  value={latestReport.auditId}
                />
              )}
            </dl>
            <Aside>{strings.networkReport.evidenceNote}</Aside>
          </Sec>

          <footer className="mt-7 flex flex-wrap justify-between gap-3 border-t border-pale-sky px-6 pt-4 font-mono text-[10px] text-regal-navy/50 sm:px-11">
            <span>
              {network.id} · {network.run.runId}
            </span>
            <span>{formatDateTime(new Date().toISOString())}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}

/** Convenience wrapper so a route can preview without pre-loading the detail. */
export function NetworkReportViewById({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data } = useNetwork(id);
  if (!data) return null;
  return <NetworkReportView network={data} open={open} onClose={onClose} />;
}

/* ------------------------------- cover ---------------------------------- */

function Cover({
  network,
  internal,
}: {
  network: NetworkDetail;
  internal: boolean;
}) {
  return (
    <header className="bg-regal-navy px-6 pt-8 pb-7 text-white sm:px-11">
      <p className="font-mono text-[10px] tracking-[0.1em] text-frosted-blue uppercase">
        {strings.networkReport.org} ·{" "}
        {internal
          ? strings.networks.reportTypeInternal
          : strings.networks.reportTypePlatform}
      </p>
      <h1 className="mt-3 text-2xl leading-tight font-bold">
        {strings.networkReport.title}
      </h1>
      <p className="mt-2 font-mono text-[11px] break-all text-white/70">
        {network.id} · {network.label}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-white/15 pt-5">
        <Gauge score={network.coordinationScore} band={network.confidenceBand} />
        <p className="max-w-[42ch] text-[11.5px] leading-relaxed text-white/70">
          <span className="mb-1 block text-[15px] font-bold text-white">
            {strings.confidence[network.confidenceBand]}
          </span>
          A Coordination Score of {network.coordinationScore.toFixed(1)} out of
          100 across {network.accountCount.toLocaleString()} accounts, with{" "}
          {network.signalBreadth} of 5 signal families independently scoring 50
          or above. It is not a measure of whether the claim is true — that was
          not measured here.
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
        <CoverCell
          k={strings.networkReport.coverAccounts}
          v={network.accountCount.toLocaleString()}
        />
        <CoverCell
          k={strings.networkReport.coverPosts}
          v={network.postCount.toLocaleString()}
        />
        <CoverCell
          k={strings.networkReport.coverPeriod}
          v={`${formatDate(network.run.windowStart)} — ${formatDate(network.run.windowEnd)}`}
          small
        />
        {network.platforms.length > 0 && (
          <CoverCell
            k={strings.networkReport.coverPlatforms}
            v={network.platforms.join(", ")}
            small
          />
        )}
        <CoverCell
          k={strings.networkReport.coverBreadth}
          v={`${network.signalBreadth} of 5`}
        />
        <CoverCell
          k={strings.networkReport.coverDetected}
          v={formatDate(network.detectedAt)}
          small
        />
        <CoverCell
          k={strings.networkReport.coverStatus}
          v={strings.networkStatus[network.reviewStatus]}
          small
        />
        {network.review?.reviewedBy && (
          <CoverCell
            k={strings.networkReport.coverIssuedBy}
            v={network.review.reviewedBy}
            small
          />
        )}
      </dl>

      {network.disclaimer && (
        <div className="mt-6 rounded-xl bg-black/25 px-4 py-3.5">
          <p className="font-mono text-[9.5px] tracking-[0.06em] text-white uppercase">
            {strings.networkReport.pleaseReadFirst}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
            {network.disclaimer}
          </p>
        </div>
      )}

      {network.run.truncated && network.run.truncationNote && (
        <p className="mt-3 rounded-xl bg-gold/20 px-4 py-3 text-[11px] leading-relaxed text-white">
          {network.run.truncationNote}
        </p>
      )}
    </header>
  );
}

function CoverCell({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] tracking-[0.05em] text-frosted-blue uppercase">
        {k}
      </dt>
      <dd
        className={cn(
          "mt-1 font-bold break-words",
          small ? "text-[12px]" : "text-[15px] tabular-nums",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

/** Half-dial, drawn from the score alone so screen and paper agree exactly. */
function Gauge({ score, band }: { score: number; band: string }) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const angle = Math.PI * (1 - clamped / 100);
  const R = 62;
  const cx = 74;
  const cy = 74;
  const x = cx + R * Math.cos(angle);
  const y = cy - R * Math.sin(angle);
  const colour =
    band === "high" ? "#c0453d" : band === "medium" ? "#fbd30a" : "#87c5cf";

  return (
    <svg
      viewBox="0 0 148 90"
      width="148"
      height="90"
      role="img"
      aria-label={`${strings.networks.coordinationScore} ${score.toFixed(1)} of 100`}
      className="shrink-0"
    >
      <path
        d="M12 74 A62 62 0 0 1 136 74"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d={`M12 74 A62 62 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
        fill="none"
        stroke={colour}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <text
        x="74"
        y="67"
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="#fff"
      >
        {score.toFixed(1)}
      </text>
      <text x="12" y="88" fontSize="9" fill="#87c5cf">
        0
      </text>
      <text x="136" y="88" textAnchor="end" fontSize="9" fill="#87c5cf">
        100
      </text>
    </svg>
  );
}

/* ------------------------------ sections -------------------------------- */

function Sec({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-sec px-6 pt-7 sm:px-11">
      <h2 className="mb-3.5 border-b-2 border-frosted-blue pb-2 text-[14px] font-bold text-regal-navy">
        <span className="mr-2 font-mono text-[12px] text-frosted-blue">{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[12.5px] leading-relaxed text-regal-navy">
      {children}
    </p>
  );
}

function Aside({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-xl bg-frosted-blue-soft px-3.5 py-3 text-[11.5px] leading-relaxed text-regal-navy">
      {title && (
        <span className="mb-1 block font-mono text-[9.5px] tracking-[0.06em] uppercase">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}

function Explainer({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-mint-cream px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-regal-navy">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-regal-navy/70">
        {body}
      </p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[11px] text-regal-navy/60">{label}</dt>
      <dd className="text-[13px] font-bold text-regal-navy tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function MonoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dotted border-pale-sky py-1.5">
      <dt className="text-[11px] text-regal-navy/60">{label}</dt>
      <dd className="font-mono text-[10.5px] break-all text-regal-navy">
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------ findings -------------------------------- */

function Findings({ network }: { network: NetworkDetail }) {
  const why = network.whyFlagged;
  const claim = why.claimRelevance.primaryClaim ?? network.primaryClaim;
  const top = [...why.signals]
    .filter((s) => s.available)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => (s.name || SIGNAL_LABELS[s.code] || s.code).toLowerCase());

  return (
    <>
      <P>
        Between {formatDate(network.run.windowStart)} and{" "}
        {formatDate(network.run.windowEnd)},{" "}
        {network.accountCount.toLocaleString()} accounts
        {network.platforms.length > 0 && <> on {network.platforms.join(", ")}</>}{" "}
        published {network.postCount.toLocaleString()} posts that the detector
        grouped into one cluster
        {claim && <> while amplifying the claim “{claim.claimStatement}”</>}.
      </P>
      <P>
        Their behaviour scored{" "}
        <b>{network.coordinationScore.toFixed(1)} out of 100</b>, with{" "}
        <b>{network.signalBreadth} of the 5</b> signal families independently
        scoring 50 or above.
        {top.length > 0 && (
          <>
            {" "}
            The strongest {top.length > 1 ? "were" : "was"}{" "}
            {top.map((name, i) => (
              <span key={name}>
                {i > 0 && " and "}
                <b>{name}</b>
              </span>
            ))}
            .
          </>
        )}
      </P>
      <P>
        Internal density is {why.internalDensity.toFixed(2)} and conductance{" "}
        {why.conductance.toFixed(2)}, measured against{" "}
        {why.comparisonAccountCount.toLocaleString()} unclustered accounts posting
        about the same claim in the same window.
        {network.recurrence.isRecurrence && network.recurrence.count > 1 ? (
          <>
            {" "}
            This set of accounts has been recorded {network.recurrence.count}{" "}
            times
            {network.recurrence.firstSeenAt && (
              <> since {formatDate(network.recurrence.firstSeenAt)}</>
            )}
            .
          </>
        ) : (
          <> This set of accounts has not been recorded before.</>
        )}
      </P>
    </>
  );
}

/* ------------------------------- signals -------------------------------- */

function Signals({ network }: { network: NetworkDetail }) {
  const why = network.whyFlagged;
  const signals = [...why.signals].sort(
    (a, b) =>
      SIGNAL_ORDER.indexOf(a.code as (typeof SIGNAL_ORDER)[number]) -
      SIGNAL_ORDER.indexOf(b.code as (typeof SIGNAL_ORDER)[number]),
  );

  return (
    <>
      {signals.map((signal) => (
        <SignalCard key={signal.code} signal={signal} />
      ))}

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-mint-cream px-3.5 py-3">
        <span className="flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={cn(
                "block h-2 w-6 rounded-full",
                i <= network.signalBreadth ? "bg-danger" : "bg-pale-sky",
              )}
            />
          ))}
        </span>
        <span className="flex-1 text-[11.5px] leading-relaxed text-regal-navy/70">
          <b className="text-regal-navy">
            {network.signalBreadth} of 5 {strings.networkReport.breadthCaption}
          </b>{" "}
          {why.confidence.rule}
          {why.confidence.note && <> {why.confidence.note}</>}
        </span>
      </div>

      {why.signalsUnavailable.length > 0 && (
        <div className="mt-2.5 rounded-xl bg-gold-soft px-3.5 py-3 text-[11.5px] leading-relaxed text-regal-navy">
          <span className="mb-1 block font-mono text-[9.5px] tracking-[0.06em] uppercase">
            {strings.networks.signalsUnavailable}
          </span>
          {why.signalsUnavailable
            .map((code) => SIGNAL_LABELS[code] ?? code)
            .join(", ")}
          . {strings.networkReport.notMeasured} — which is not the same as a
          score of zero, and is why the sections above report no figure for
          them rather than a low one.
        </div>
      )}
    </>
  );
}

function SignalCard({ signal }: { signal: SignalDetail }) {
  const name = signal.name || SIGNAL_LABELS[signal.code] || signal.code;
  const counts = Object.entries(signal.rawCounts ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <div className="mb-2.5 rounded-xl border border-pale-sky px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="w-28 shrink-0 text-[13px] font-bold text-regal-navy">
          {name}
        </span>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-mint-cream">
          {signal.available && (
            <span
              className={cn(
                "block h-full rounded-full",
                signal.score >= 70
                  ? "bg-danger"
                  : signal.score >= 50
                    ? "bg-gold"
                    : "bg-frosted-blue",
              )}
              style={{ width: `${Math.min(Math.max(signal.score, 0), 100)}%` }}
            />
          )}
        </span>
        <span className="w-14 shrink-0 text-right text-[14px] font-bold text-regal-navy tabular-nums">
          {signal.available ? signal.score.toFixed(1) : "—"}
        </span>
        <span className="w-16 shrink-0 text-right text-[10.5px] text-regal-navy/50">
          {strings.networks.weight} {signal.weight.toFixed(2)}
        </span>
      </div>

      {signal.method && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-regal-navy/70">
          {signal.method}
        </p>
      )}

      {signal.available ? (
        counts.length > 0 && (
          <div className="mt-2 rounded-lg bg-mint-cream px-3 py-2">
            <span className="mb-1 block font-mono text-[9px] tracking-[0.06em] text-regal-navy/60 uppercase">
              {strings.networkReport.whatWeSaw}
            </span>
            <dl className="flex flex-wrap gap-x-5 gap-y-1">
              {counts.map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-1.5">
                  <dt className="text-[11px] text-regal-navy/60">
                    {humanise(key)}
                  </dt>
                  <dd className="text-[11.5px] font-bold text-regal-navy tabular-nums">
                    {formatValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )
      ) : (
        <p className="mt-2 rounded-lg bg-gold-soft px-3 py-2 text-[11px] text-regal-navy">
          {strings.networks.signalUnavailableHint}
        </p>
      )}
    </div>
  );
}

/* ---------------------------- signup timeline --------------------------- */

/**
 * One dot per member account on the date its profile was opened. Accounts the
 * platform gave no creation date for are counted rather than placed — putting
 * them anywhere on the axis would be inventing the very figure the section is
 * about.
 */
function SignupTimeline({ rows }: { rows: AccountAnnexRow[] }) {
  const dated = useMemo(
    () =>
      rows
        .map((r) => ({
          role: r.role,
          t: r.createdAtPlatform ? Date.parse(r.createdAtPlatform) : NaN,
        }))
        .filter((r) => !Number.isNaN(r.t)),
    [rows],
  );
  const missing = rows.length - dated.length;
  if (dated.length === 0) return null;

  const times = dated.map((d) => d.t);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;

  return (
    <>
      <div className="relative mt-1 h-14">
        <div className="absolute top-7 right-0 left-0 h-px bg-pale-sky" />
        {dated.map((d, i) => (
          <span
            key={i}
            className={cn(
              "absolute top-[24px] -ml-1 block size-2 rounded-full",
              d.role === "member"
                ? "bg-danger"
                : "border border-glaucous bg-white",
            )}
            style={{ left: `${(((d.t - min) / span) * 96 + 2).toFixed(2)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[9.5px] text-regal-navy/50">
        <span>
          {strings.networkReport.signupOldest} · {formatDate(new Date(min).toISOString())}
        </span>
        <span>
          {strings.networkReport.signupNewest} · {formatDate(new Date(max).toISOString())}
        </span>
      </div>
      {missing > 0 && (
        <p className="mt-2 text-[11px] text-regal-navy/60">
          {missing} of {rows.length} {strings.networkReport.signupMissing}
        </p>
      )}
    </>
  );
}

/* ------------------------------ relevance ------------------------------- */

function Relevance({ network }: { network: NetworkDetail }) {
  const rel = network.whyFlagged.claimRelevance;
  const primary = rel.primaryClaim;
  if (!primary) return null;

  const share = Math.round(
    Math.min(Math.max(primary.overlapRatio, 0), 1) * 100,
  );
  const gate = Math.round(
    Math.min(Math.max(rel.minLinkStrengthThreshold, 0), 1) * 100,
  );

  return (
    <>
      <div className="flex h-7 overflow-hidden rounded-lg font-mono text-[10px]">
        <span
          className="flex items-center justify-center bg-danger px-1 text-white"
          style={{ width: `${share}%` }}
        >
          {share >= 18 && `${share}% ${strings.networkReport.shareThisClaim}`}
        </span>
        <span
          className="flex items-center justify-center bg-pale-sky px-1 text-regal-navy"
          style={{ width: `${100 - share}%` }}
        >
          {100 - share >= 30 && `${100 - share}% ${strings.networkReport.shareEverythingElse}`}
        </span>
      </div>
      <div className="relative mt-1 h-4 font-mono text-[9.5px] text-regal-navy/60">
        <span
          className="absolute -top-1 block h-2.5 w-px bg-regal-navy"
          style={{ left: `${gate}%` }}
        />
        <span className="inline-block" style={{ marginLeft: `${gate}%` }}>
          ↑ {strings.networkReport.shareGate}: {gate}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <RelCell
          k={strings.networks.relLinkStrength}
          v={primary.overlapRatio.toFixed(2)}
          p={`${strings.networks.gateShort} ${rel.minLinkStrengthThreshold.toFixed(2)}`}
        />
        <RelCell
          k={strings.networks.relAnchoring}
          v={`${Math.round(primary.anchoringShare * 100)}%`}
          p={`${strings.networks.gateShort} ${Math.round(rel.anchorShareThreshold * 100)}%`}
        />
        <RelCell
          k={strings.networks.relEvidence}
          v={primary.claimClusterPostCount.toLocaleString()}
          p={`${strings.networks.gateShort} ${rel.minClaimPostsThreshold.toLocaleString()}`}
        />
        <RelCell
          k={strings.networks.relSecondary}
          v={rel.secondaryClaims.length.toLocaleString()}
          p={strings.networks.relSecondaryNote}
        />
      </div>

      {rel.secondaryClaims.length > 0 && (
        <ul className="mt-3 space-y-1">
          {rel.secondaryClaims.map((claim) => (
            <li
              key={claim.claimId}
              className="rounded-lg bg-mint-cream px-3 py-2 text-[11.5px] text-regal-navy"
            >
              {claim.claimStatement}
              {!claim.passedRelevanceGate && (
                <span className="ml-1 text-regal-navy/50">
                  — did not pass the relevance gate
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RelCell({ k, v, p }: { k: string; v: string; p: string }) {
  return (
    <div className="rounded-lg bg-mint-cream px-3 py-2.5">
      <p className="font-mono text-[9px] tracking-[0.05em] text-regal-navy/60 uppercase">
        {k}
      </p>
      <p className="mt-1 text-[15px] font-bold text-regal-navy tabular-nums">{v}</p>
      <p className="mt-1 text-[10px] text-regal-navy/50">{p}</p>
    </div>
  );
}

/* -------------------------------- burst --------------------------------- */

function Burst({ timeline }: { timeline: BurstTimeline }) {
  const max = Math.max(...timeline.bins.map((b) => b.postCount), 1);
  return (
    <>
      <div className="mt-5 flex h-16 items-end gap-0.5">
        {timeline.bins.map((bin, i) => {
          // A burst usually spans several adjacent bins, and one z label per
          // bar collides into an unreadable smear. Label the run once, at its
          // first bar; every bar still carries its own z in the tooltip.
          const labelled =
            bin.isAnomalous && !timeline.bins[i - 1]?.isAnomalous;
          return (
          <span
            key={bin.binStart}
            className="relative block flex-1 rounded-t-sm"
            style={{
              height: `${Math.max((bin.postCount / max) * 100, 2)}%`,
              backgroundColor: bin.isAnomalous
                ? "var(--color-danger)"
                : "var(--color-pale-sky)",
            }}
            title={`${formatDateTime(bin.binStart)} · ${bin.postCount} posts · z ${bin.zScore.toFixed(2)}`}
          >
            {labelled && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[8.5px] whitespace-nowrap text-danger">
                z {bin.zScore.toFixed(1)}
              </span>
            )}
          </span>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-regal-navy/50">
        <span>{formatDateTime(timeline.windowStart)}</span>
        <span>
          {strings.networks.timelineBin}{" "}
          {timeline.binWidthSeconds < 3600
            ? `${Math.round(timeline.binWidthSeconds / 60)} min`
            : `${Math.round(timeline.binWidthSeconds / 3600)} h`}{" "}
          · {timeline.anomalousCount} {strings.networks.timelineAnomalous}
        </span>
        <span>{formatDateTime(timeline.windowEnd)}</span>
      </div>
    </>
  );
}

/* ------------------------------- content -------------------------------- */

function DuplicateGroups({ content }: { content: RepresentativeContent }) {
  return (
    <>
      {content.groups.map((group, index) => (
        <div
          key={group.groupId}
          className="mb-2.5 rounded-xl border border-pale-sky px-3.5 py-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold tracking-[0.05em] text-regal-navy/60 uppercase">
              {strings.networks.duplicateGroup} {index + 1}
            </span>
            <span className="font-mono text-[10px] text-regal-navy/50">
              {group.variantCount} {strings.networks.variants}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed font-bold text-regal-navy">
            {group.canonicalText}
          </p>
          {group.variants.map((post) => (
            <div
              key={post.id}
              className="mt-2 border-t border-dashed border-pale-sky pt-2"
            >
              <div className="flex flex-wrap justify-between gap-2 font-mono text-[9.5px] text-regal-navy/50">
                <span>{post.handle}</span>
                <span>
                  {formatDateTime(post.postedAt)}
                  {!post.stillPublic && post.availability && (
                    <> · {post.availability}</>
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-regal-navy">
                <Span
                  text={post.text}
                  start={post.sharedSpanStart}
                  end={post.sharedSpanEnd}
                />
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-regal-navy/40">
                {post.contentSha256.slice(0, 16)}
              </p>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Span({
  text,
  start,
  end,
}: {
  text: string;
  start: number | null;
  end: number | null;
}) {
  if (start === null || end === null || start < 0 || end > text.length || start >= end) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-gold-soft px-0.5 text-regal-navy">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

/* ------------------------------- accounts ------------------------------- */

function AccountTable({
  rows,
  total,
}: {
  rows: AccountAnnexRow[];
  total: number;
}) {
  const shown = rows.slice(0, 25);
  return (
    <>
      <table className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr>
            {[
              strings.networks.colHandle,
              strings.networks.colPlatform,
              strings.networks.colCreated,
              strings.networks.colPosts,
              strings.networks.colDuplication,
              strings.networks.colInterpost,
              strings.networks.colCircadian,
              strings.networks.colCentrality,
            ].map((label) => (
              <th
                key={label}
                scope="col"
                className="border-b border-pale-sky pr-2.5 pb-1.5 text-left font-mono text-[9px] font-medium tracking-[0.04em] text-regal-navy/60 uppercase"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.accountId}>
              <td className="border-b border-pale-sky py-2 pr-2.5 font-mono">
                {row.handle}
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5">
                {row.platform}
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5 whitespace-nowrap">
                {formatDate(row.createdAtPlatform)}
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5 tabular-nums">
                {row.postsInCluster.toLocaleString()}
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5">
                <span className="mr-1.5 inline-block h-1.5 w-8 overflow-hidden rounded-full bg-mint-cream align-middle">
                  <span
                    className="block h-full bg-danger"
                    style={{
                      width: `${Math.round(Math.min(Math.max(row.duplicationRate, 0), 1) * 100)}%`,
                    }}
                  />
                </span>
                <span className="tabular-nums">
                  {row.duplicationRate.toFixed(2)}
                </span>
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5 tabular-nums">
                {formatInterval(row.medianInterpostSeconds)}
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5 tabular-nums">
                {row.circadianCoverage.toFixed(2)}
              </td>
              <td className="border-b border-pale-sky py-2 pr-2.5 tabular-nums">
                {row.degreeCentrality.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > shown.length && (
        <p className="mt-2.5 text-[11px] text-regal-navy/60">
          {total - shown.length} {strings.networkReport.accountsMore}
        </p>
      )}
    </>
  );
}

function formatInterval(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

/* ------------------------------- internal ------------------------------- */

function Internal({
  network,
  log,
}: {
  network: NetworkDetail;
  log: NetworkReviewLogEntry[];
}) {
  return (
    <>
      <dl className="mb-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <dt className="text-[11px] text-regal-navy/60">
            {strings.networkReport.internalStatus}
          </dt>
          <dd>
            <NetworkStatusPill status={network.reviewStatus} />
          </dd>
        </div>
        {network.linkedClaims.length > 0 && (
          <div>
            <dt className="text-[11px] text-regal-navy/60">
              {strings.networkReport.internalClaim}
            </dt>
            <dd className="text-[12px] text-regal-navy">
              {network.linkedClaims.map((c) => c.claimStatement).join(" · ")}
            </dd>
          </div>
        )}
        {network.linkedPolicies.length > 0 && (
          <div>
            <dt className="text-[11px] text-regal-navy/60">
              {strings.networkReport.internalPolicies}
            </dt>
            <dd className="text-[12px] text-regal-navy">
              {network.linkedPolicies.map((p) => p.name).join(" · ")}
            </dd>
          </div>
        )}
      </dl>

      {network.review?.reason && (
        <div className="rounded-xl bg-mint-cream px-3.5 py-3">
          <span className="mb-1 block font-mono text-[9.5px] tracking-[0.06em] text-regal-navy/60 uppercase">
            {strings.networkReport.internalNote}
          </span>
          <p className="text-[12px] leading-relaxed text-regal-navy">
            {network.review.reason}
          </p>
          <p className="mt-1.5 font-mono text-[10px] text-regal-navy/50">
            {formatDateTime(network.review.reviewedAt)}
            {network.review.reviewedBy && <> · {network.review.reviewedBy}</>}
          </p>
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[9.5px] tracking-[0.06em] text-regal-navy/60 uppercase">
            {strings.networkReport.internalHistory}
          </p>
          <ul className="space-y-1.5">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-dotted border-pale-sky pb-1.5 text-[11.5px] text-regal-navy"
              >
                <span className="font-mono text-[10px] text-regal-navy/50">
                  {formatDateTime(entry.createdAt)} ·{" "}
                  {strings.networkStatus[entry.fromStatus]} →{" "}
                  {strings.networkStatus[entry.toStatus]}
                </span>
                <p className="mt-0.5 leading-relaxed">{entry.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/* -------------------------------- params -------------------------------- */

function Params({
  params,
  seed,
}: {
  params: Record<string, unknown>;
  seed: number | null;
}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  return (
    <>
      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex justify-between gap-2 border-b border-dotted border-pale-sky py-1 font-mono text-[10.5px]"
          >
            <dt className="text-regal-navy/60">{humanise(key)}</dt>
            <dd className="font-medium text-regal-navy">{formatValue(value)}</dd>
          </div>
        ))}
        {seed !== null && (
          <div className="flex justify-between gap-2 border-b border-dotted border-pale-sky py-1 font-mono text-[10.5px]">
            <dt className="text-regal-navy/60">Random seed</dt>
            <dd className="font-medium text-regal-navy">{seed}</dd>
          </div>
        )}
      </dl>
    </>
  );
}
