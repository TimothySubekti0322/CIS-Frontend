"use client";

import Link from "next/link";
import { AlertTriangle, Info, MinusCircle } from "lucide-react";
import type { NetworkClaimRef, SignalDetail, WhyFlagged } from "@/types/network";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { SIGNAL_LABELS, SIGNAL_ORDER } from "@/lib/constants/networkStatuses";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

/**
 * US50 — "Why this was flagged". The F5 counterpart of US23's score breakdown,
 * carrying the same hard constraint: the composite is never displayed without
 * access to this. Every signal shows its score, a meter, a plain-language
 * method, the raw counts behind it, and its weight in the composite.
 *
 * A policy reviewer must be able to read this panel without knowing what
 * conductance is — hence the method sentences come from the server rather than
 * being invented in the client.
 */
export function WhyFlaggedPanel({ why }: { why: WhyFlagged }) {
  // Fixed family order so the panel, the graph legend and the PDF agree.
  const signals = [...why.signals].sort(
    (a, b) =>
      SIGNAL_ORDER.indexOf(a.code as (typeof SIGNAL_ORDER)[number]) -
      SIGNAL_ORDER.indexOf(b.code as (typeof SIGNAL_ORDER)[number]),
  );

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3">{strings.networks.whyFlagged}</h2>
          <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
            {strings.networks.whyFlaggedNote}
          </p>
        </div>
        <ScoreBadge
          score={why.coordinationScore}
          size="lg"
          showScale
          label={strings.networks.coordinationScore}
        />
      </div>

      <ConfidenceBlock why={why} />

      <div className="space-y-4">
        {signals.map((signal) => (
          <SignalRow key={signal.code} signal={signal} />
        ))}
      </div>

      {why.signalsUnavailable.length > 0 && (
        <div className="rounded-lg border border-pale-sky bg-mint-cream p-3">
          <p className="text-xs font-bold text-regal-navy">
            {strings.networks.signalsUnavailable}
          </p>
          <p className="mt-1 text-xs text-regal-navy/70">
            {why.signalsUnavailable
              .map((code) => SIGNAL_LABELS[code] ?? code)
              .join(", ")}
          </p>
        </div>
      )}

      <StructureBlock why={why} />
      <ClaimRelevance why={why} />

      {why.knownLimitations.length > 0 && (
        <div className="rounded-lg border border-dashed border-glaucous bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-regal-navy">
            <Info className="size-3.5" aria-hidden />
            {strings.networks.knownLimitations}
          </p>
          <ul className="mt-2 space-y-1">
            {why.knownLimitations.map((limitation, i) => (
              <li key={i} className="text-xs text-regal-navy/70">
                • {limitation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Names the rule that produced the band, and whether the run capped it. */
function ConfidenceBlock({ why }: { why: WhyFlagged }) {
  const { confidence } = why;
  return (
    <div className="rounded-lg border border-pale-sky bg-mint-cream p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-regal-navy">
          {strings.networks.confidenceRule}
        </span>
        {confidence.cappedByRun && (
          <StatusPill tone="warn">{strings.networks.cappedAtMedium}</StatusPill>
        )}
      </div>
      <p className="mt-1 text-xs text-regal-navy/70">{confidence.rule}</p>
      {confidence.note && (
        <p className="mt-1 text-xs text-regal-navy/60">{confidence.note}</p>
      )}
    </div>
  );
}

/**
 * One signal family. `available: false` is rendered as an explicit
 * "not measurable this run" state rather than a zero bar — a zero would be a
 * measurement, and reading one as the other is how a run with a dead signal
 * gets mistaken for a clean cluster.
 */
function SignalRow({ signal }: { signal: SignalDetail }) {
  const name = signal.name || SIGNAL_LABELS[signal.code] || signal.code;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-regal-navy">
          <span className="mr-1.5 rounded bg-glaucous-soft px-1.5 py-0.5 font-mono text-xs">
            {signal.code}
          </span>
          {name}
        </span>
        <span className="flex items-center gap-2 text-xs text-regal-navy/60">
          <span>
            {strings.networks.weight} {signal.weight.toFixed(2)}
          </span>
          {signal.available ? (
            <span className="text-sm font-bold tabular-nums text-regal-navy">
              {signal.score.toFixed(1)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-glaucous">
              <MinusCircle className="size-3.5" aria-hidden />
              {strings.networks.signalUnavailable}
            </span>
          )}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-pale-sky/60"
        role="meter"
        aria-valuenow={signal.available ? signal.score : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name} score`}
        title={
          signal.available
            ? `${name}: ${signal.score.toFixed(1)} / 100`
            : strings.networks.signalUnavailableHint
        }
      >
        {signal.available ? (
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              signal.score >= 70
                ? "bg-danger"
                : signal.score >= 50
                  ? "bg-gold"
                  : "bg-frosted-blue",
            )}
            style={{ width: `${Math.min(Math.max(signal.score, 0), 100)}%` }}
          />
        ) : (
          // Hatched rather than empty: nothing was measured here.
          <div className="h-full w-full bg-[repeating-linear-gradient(45deg,var(--color-pale-sky)_0_4px,transparent_4px_8px)]" />
        )}
      </div>

      {signal.method && (
        <p className="text-xs text-regal-navy/70">{signal.method}</p>
      )}
      {signal.rawCounts && <RawCounts counts={signal.rawCounts} />}
    </div>
  );
}

/**
 * The observation behind the normalised score. Rendered generically because the
 * shape differs per family and the backend owns it — inventing a fixed schema
 * here would quietly drop whatever a new family reports.
 */
function RawCounts({ counts }: { counts: Record<string, unknown> }) {
  const entries = Object.entries(counts).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (entries.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-mint-cream px-3 py-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline gap-1.5">
          <dt className="text-xs text-regal-navy/60">{humanise(key)}</dt>
          <dd className="text-xs font-bold tabular-nums text-regal-navy">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StructureBlock({ why }: { why: WhyFlagged }) {
  return (
    <div>
      <p className="text-xs font-bold text-regal-navy">
        {strings.networks.clusterStructure}
      </p>
      <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
        <Figure
          label={strings.networks.internalDensity}
          value={why.internalDensity.toFixed(2)}
        />
        <Figure
          label={strings.networks.conductance}
          value={why.conductance.toFixed(2)}
        />
        <Figure
          label={strings.networks.comparisonAccounts}
          value={why.comparisonAccountCount.toLocaleString()}
        />
      </dl>
    </div>
  );
}

/**
 * The claim-relevance block. Anchoring a run to a claim does not make what it
 * finds *about* that claim, and the signal scores cannot tell the difference —
 * which is why these three figures are shown against the thresholds they had
 * to clear.
 */
function ClaimRelevance({ why }: { why: WhyFlagged }) {
  const { claimRelevance: rel } = why;
  const primary = rel.primaryClaim;

  return (
    <div className="rounded-lg border border-pale-sky p-3">
      <p className="text-xs font-bold text-regal-navy">
        {strings.networks.claimRelevance}
      </p>
      <p className="mt-1 text-xs text-regal-navy/60">
        {strings.networks.claimRelevanceNote}
      </p>

      {primary ? (
        <>
          <ClaimLink claim={primary} className="mt-2" />
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <Figure
              label={strings.networks.overlapRatio}
              value={primary.overlapRatio.toFixed(2)}
              against={rel.minLinkStrengthThreshold.toFixed(2)}
            />
            <Figure
              label={strings.networks.anchoringShare}
              value={primary.anchoringShare.toFixed(2)}
              against={rel.anchorShareThreshold.toFixed(2)}
            />
            <Figure
              label={strings.networks.clusterPosts}
              value={primary.claimClusterPostCount.toLocaleString()}
              against={rel.minClaimPostsThreshold.toLocaleString()}
            />
          </dl>
        </>
      ) : (
        <p className="mt-2 text-xs text-regal-navy/60">—</p>
      )}

      {rel.secondaryClaims.length > 0 && (
        <div className="mt-3 border-t border-pale-sky pt-2">
          <p className="text-xs font-bold text-regal-navy">
            {strings.networks.secondaryClaims}
          </p>
          <div className="mt-1 space-y-1">
            {rel.secondaryClaims.map((claim) => (
              <ClaimLink key={claim.claimId} claim={claim} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Linked claims navigate to the existing F1 pages — F5 duplicates no claim UI. */
export function ClaimLink({
  claim,
  className,
}: {
  claim: NetworkClaimRef;
  className?: string;
}) {
  return (
    <Link
      href={`/claims/${claim.claimId}`}
      className={cn(
        "block rounded-lg border border-pale-sky bg-white px-3 py-2 text-xs text-regal-navy transition-colors hover:border-sea-green hover:text-sea-green",
        className,
      )}
    >
      <span className="line-clamp-2">{claim.claimStatement}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2 text-regal-navy/50">
        {claim.topic && <span>{claim.topic.name}</span>}
        {!claim.passedRelevanceGate && (
          <span className="inline-flex items-center gap-1 text-danger">
            <AlertTriangle className="size-3" aria-hidden />
            Did not pass the relevance gate
          </span>
        )}
      </span>
    </Link>
  );
}

function Figure({
  label,
  value,
  against,
}: {
  label: string;
  value: string;
  against?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs text-regal-navy/60">{label}</dt>
      <dd className="text-sm font-bold tabular-nums text-regal-navy">
        {value}
        {against && (
          <span className="ml-1 text-xs font-normal text-regal-navy/50">
            ({strings.networks.threshold} {against})
          </span>
        )}
      </dd>
    </div>
  );
}

/** `posts_within_window` -> "Posts within window". */
export function humanise(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}
