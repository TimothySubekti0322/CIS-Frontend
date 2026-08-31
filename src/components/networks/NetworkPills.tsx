import { AlertTriangle, Layers, ShieldQuestion } from "lucide-react";
import type { ConfidenceBand, NetworkReviewStatus } from "@/types/network";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  CONFIDENCE_MAP,
  NETWORK_STATUS_MAP,
} from "@/lib/constants/networkStatuses";
import { strings } from "@/lib/constants/strings";

/**
 * Confidence band and review status are **orthogonal axes** (PRD 10.10) and are
 * rendered as two separate pills for exactly that reason: US61 requires
 * "Unreviewed, Medium" and "Confirmed, High" to read differently to an analyst
 * deciding whether to rebut or refer. They are never collapsed into one label.
 */

export function ConfidencePill({
  band,
  className,
}: {
  band: ConfidenceBand;
  className?: string;
}) {
  const meta = CONFIDENCE_MAP[band];
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}

export function NetworkStatusPill({
  status,
  className,
}: {
  status: NetworkReviewStatus;
  className?: string;
}) {
  const meta = NETWORK_STATUS_MAP[status];
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}

/**
 * SignalBreadth, shown beside the band rather than inside it. The banding rule
 * is a conjunction — a score of 90 with one family agreeing is still Low — so
 * the breadth has to be visible wherever the band is.
 */
export function SignalBreadthPill({ breadth }: { breadth: number }) {
  return (
    <StatusPill
      tone="muted"
      icon={<Layers className="size-3" aria-hidden />}
      className="tabular-nums"
    >
      <span title={strings.networks.signalBreadthHint}>
        {strings.networks.signalBreadth} {breadth}/5
      </span>
    </StatusPill>
  );
}

/**
 * A truncated run has known-incomplete recall, which changes what the score
 * means — so the caveat travels on the card, where triage happens, not only on
 * the detail page.
 */
export function TruncatedRunPill({ note }: { note?: string | null }) {
  return (
    <StatusPill
      tone="warn"
      icon={<AlertTriangle className="size-3" aria-hidden />}
    >
      <span title={note ?? strings.networks.truncatedRunHint}>
        {strings.networks.truncatedRun}
      </span>
    </StatusPill>
  );
}

/** Rule 4: ≥ 2 unavailable signal families cap the run regardless of score. */
export function CappedPill() {
  return (
    <StatusPill
      tone="muted"
      icon={<ShieldQuestion className="size-3" aria-hidden />}
    >
      <span title={strings.networks.cappedAtMediumHint}>
        {strings.networks.cappedAtMedium}
      </span>
    </StatusPill>
  );
}

/** Revealed only by US43's toggle — labelled, never silently mixed in. */
export function LowConfidenceTag() {
  return (
    <StatusPill tone="muted">
      <span title={strings.networks.lowConfidenceHint}>
        {strings.networks.lowConfidenceTag}
      </span>
    </StatusPill>
  );
}
