"use client";

import type { ReactNode } from "react";
import type { SignalDetail, WhyFlagged } from "@/types/network";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { SIGNAL_LABELS, SIGNAL_ORDER } from "@/lib/constants/networkStatuses";

/**
 * The building blocks of the [S4] cluster sheet.
 *
 * The detail page is one document rather than a wall of cards, so the sections
 * inside it are separated by a rule and a small caps heading instead of by a
 * border and a shadow. The card shape and the palette are unchanged — only the
 * nesting is: a card inside a card reads as two objects, and this page is one.
 */

export function DetBlock({
  heading,
  count,
  action,
  note,
  children,
  className,
}: {
  heading: string;
  count?: ReactNode;
  action?: ReactNode;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.06em] text-regal-navy/60 uppercase">
          {heading}
          {count !== undefined && count !== null && (
            <span className="rounded-full bg-mint-cream px-2 py-0.5 text-[11px] tracking-normal text-regal-navy tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      {note && <p className="mt-1 max-w-3xl text-xs text-regal-navy/60">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * The signal profile, reduced to what can be read at a glance: the family, a
 * meter, and the number. US50's requirement that the composite is never shown
 * without its breakdown is met by the report, which carries each family's
 * method sentence, underlying counts and weight in full — this is the summary
 * view of the same five numbers, not a replacement for them.
 */
export function SignalProfile({ why }: { why: WhyFlagged }) {
  const signals = [...why.signals].sort(
    (a, b) =>
      SIGNAL_ORDER.indexOf(a.code as (typeof SIGNAL_ORDER)[number]) -
      SIGNAL_ORDER.indexOf(b.code as (typeof SIGNAL_ORDER)[number]),
  );

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {signals.map((signal) => (
        <SignalBar key={signal.code} signal={signal} />
      ))}
    </div>
  );
}

function SignalBar({ signal }: { signal: SignalDetail }) {
  const name = signal.name || SIGNAL_LABELS[signal.code] || signal.code;
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-32 shrink-0 truncate text-sm text-regal-navy"
        title={signal.method || name}
      >
        {name}
      </span>
      <span
        className="h-2 flex-1 overflow-hidden rounded-full bg-pale-sky/60"
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
        ) : (
          // Hatched, not empty: nothing was measured, which is not a zero.
          <span className="block h-full w-full bg-[repeating-linear-gradient(45deg,var(--color-pale-sky)_0_4px,transparent_4px_8px)]" />
        )}
      </span>
      {signal.available ? (
        <span className="w-9 shrink-0 text-right text-sm font-bold text-regal-navy tabular-nums">
          {Math.round(signal.score)}
        </span>
      ) : (
        <span
          className="w-9 shrink-0 text-right text-[11px] text-glaucous"
          title={strings.networks.signalUnavailableHint}
        >
          n/a
        </span>
      )}
    </div>
  );
}

/**
 * The relevance gate, as four figures against the thresholds each had to
 * clear. Anchoring a run to a claim does not make what it finds *about* that
 * claim, and no signal score can tell the difference.
 */
export function ClaimRelevanceGrid({ why }: { why: WhyFlagged }) {
  const rel = why.claimRelevance;
  const primary = rel.primaryClaim;
  if (!primary) return null;

  const cells: { k: string; v: string; p: string }[] = [
    {
      k: strings.networks.relLinkStrength,
      v: primary.overlapRatio.toFixed(2),
      p: `${strings.networks.relLinkStrengthNote} · ${strings.networks.gateShort} ${rel.minLinkStrengthThreshold.toFixed(2)}`,
    },
    {
      k: strings.networks.relAnchoring,
      v: `${Math.round(primary.anchoringShare * 100)}%`,
      p: `${strings.networks.relAnchoringNote} · ${strings.networks.gateShort} ${Math.round(rel.anchorShareThreshold * 100)}%`,
    },
    {
      k: strings.networks.relEvidence,
      v: primary.claimClusterPostCount.toLocaleString(),
      p: `${strings.networks.relEvidenceNote} · ${strings.networks.gateShort} ${rel.minClaimPostsThreshold.toLocaleString()}`,
    },
    {
      k: strings.networks.relSecondary,
      v: rel.secondaryClaims.length.toLocaleString(),
      p: strings.networks.relSecondaryNote,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={cell.k}
          className="rounded-xl border-l-2 border-mint-leaf bg-mint-cream px-3 py-2.5"
        >
          <p className="text-[10px] font-bold tracking-[0.05em] text-regal-navy/60 uppercase">
            {cell.k}
          </p>
          <p className="mt-1 text-lg leading-none font-bold text-regal-navy tabular-nums">
            {cell.v}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-regal-navy/60">
            {cell.p}
          </p>
        </div>
      ))}
    </div>
  );
}
