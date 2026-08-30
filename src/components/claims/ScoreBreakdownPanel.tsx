import type { ScoreBreakdown } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

/**
 * The full transparent score breakdown. Every component the backend sends is
 * displayed alongside FinalClaimScore — the collapsed number is never shown
 * alone.
 *
 * Weights are read from the payload, not hardcoded, so a backend re-weighting
 * shows up here without a frontend change.
 */
export function ScoreBreakdownPanel({ score }: { score: ScoreBreakdown }) {
  const weights = score.weights;
  const rows = [
    { key: "reach", label: "Reach & Spread (R)", value: score.reach, weight: weights?.reach },
    { key: "velocity", label: "Velocity (V)", value: score.velocity, weight: weights?.velocity },
    { key: "falseness", label: "Falseness Confidence (F)", value: score.falseness, weight: weights?.falseness },
    { key: "harm", label: "Harm Severity (H)", value: score.harm, weight: weights?.harm },
    {
      key: "ei",
      label: strings.claims.eiSupporting,
      value: score.emotionalIntensity,
      weight: weights?.emotionalIntensity,
    },
  ];

  const harm = score.harmBreakdown;

  return (
    <div className="space-y-4 rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-h3">{strings.claims.scoreBreakdown}</h3>
        {score.isDormant && (
          <StatusPill tone="neutral">{strings.claims.dormant}</StatusPill>
        )}
      </div>

      <dl className="space-y-2.5">
        {rows.map((row) => (
          <ScoreRow
            key={row.key}
            label={row.label}
            value={row.value}
            weight={row.weight}
          />
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-3 border-t border-pale-sky pt-3 text-sm">
        <Stat label="ClaimScore (pre-discount)" value={score.claimScore.toFixed(1)} />
        {/* Dormant claims come back with npr / discountFactor null: the claim is
            flagged, never discounted, so its priority cannot drop on
            statistically unreliable data. */}
        <Stat label="NPR" value={score.npr === null ? "—" : score.npr.toFixed(2)} />
        <Stat
          label="DiscountFactor"
          value={score.discountFactor === null ? "—" : score.discountFactor.toFixed(2)}
        />
        <div>
          <p className="text-xs text-regal-navy/60">FinalClaimScore</p>
          <ScoreBadge
            score={score.finalClaimScore}
            showScale
            size="md"
            className="mt-1"
          />
        </div>
      </div>

      {harm && (
        <div className="border-t border-pale-sky pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-regal-navy/50">
              {strings.claims.harmBreakdown}
            </p>
            {harm.humanConfirmed && (
              <StatusPill tone="success">Human confirmed</StatusPill>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Public safety" value={harm.publicSafety.toFixed(0)} />
            <Stat
              label="Institutional trust"
              value={harm.institutionalTrust.toFixed(0)}
            />
            <Stat label="Economic" value={harm.economic.toFixed(0)} />
            <Stat
              label="Policy disruption"
              value={harm.policyDisruption.toFixed(0)}
            />
          </div>
        </div>
      )}

      {/* EI supporting vs opposing, side by side. Opposing is diagnostic only
          and never enters the score. */}
      <div className="border-t border-pale-sky pt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-regal-navy/50">
          Emotional intensity — supporting vs opposing
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label={strings.claims.eiSupporting}
            value={score.emotionalIntensity.toFixed(1)}
          />
          <Stat
            label={strings.claims.eiOpposing}
            value={score.emotionalIntensityOpposing.toFixed(1)}
          />
        </div>
      </div>

      {(score.note || score.isDormant) && (
        <p className="text-xs text-regal-navy/60">
          {score.note ?? strings.claims.dormantHint}
        </p>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-44 shrink-0 text-sm text-regal-navy/70">
        {label}
        {weight !== undefined && (
          <span className="ml-1 text-xs text-regal-navy/40">
            ×{weight.toFixed(2)}
          </span>
        )}
      </dt>
      <dd className="flex flex-1 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-pale-sky/60">
          <div
            className={cn(
              "h-full rounded-full",
              value >= 70 ? "bg-gold" : value >= 40 ? "bg-frosted-blue" : "bg-glaucous",
            )}
            style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-bold tabular-nums">
          {value.toFixed(0)}
        </span>
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-regal-navy/60">{label}</p>
      <p className="text-sm font-bold tabular-nums text-regal-navy">{value}</p>
    </div>
  );
}
