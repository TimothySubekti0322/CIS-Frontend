import type { ScoreBreakdown } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

/**
 * Full transparent score breakdown (PRD US23, §6.5). Every component is shown
 * alongside FinalClaimScore — the collapsed number is never shown alone.
 */
export function ScoreBreakdownPanel({ score }: { score: ScoreBreakdown }) {
  const params: { key: string; label: string; value: number }[] = [
    { key: "r", label: "Reach & Spread (R)", value: score.r },
    { key: "v", label: "Velocity (V)", value: score.v },
    { key: "f", label: "Falseness Confidence (F)", value: score.f },
    { key: "h", label: "Harm Severity (H)", value: score.h },
    { key: "ei", label: strings.claims.eiSupporting, value: score.ei },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-h3">{strings.claims.scoreBreakdown}</h3>
        {score.dormant && (
          <StatusPill tone="neutral">{strings.claims.dormant}</StatusPill>
        )}
      </div>

      <dl className="space-y-2.5">
        {params.map((p) => (
          <ScoreRow key={p.key} label={p.label} value={p.value} />
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-3 border-t border-pale-sky pt-3 text-sm">
        <Stat label="ClaimScore (pre-discount)" value={score.claimScore.toFixed(1)} />
        <Stat label="NPR" value={score.npr.toFixed(2)} />
        <Stat label="DiscountFactor" value={score.discountFactor.toFixed(2)} />
        <div>
          <p className="text-xs text-regal-navy/60">FinalClaimScore</p>
          <ScoreBadge score={score.finalClaimScore} showScale size="md" className="mt-1" />
        </div>
      </div>

      {/* EI supporting vs opposing, side by side (PRD US24) */}
      <div className="border-t border-pale-sky pt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-regal-navy/50">
          Emotional intensity — supporting vs opposing
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={strings.claims.eiSupporting} value={score.ei.toFixed(1)} />
          <Stat
            label={strings.claims.eiOpposing}
            value={score.eiOpposing.toFixed(1)}
          />
        </div>
      </div>

      {score.dormant && (
        <p className="text-xs text-regal-navy/60">{strings.claims.dormantHint}</p>
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-44 shrink-0 text-sm text-regal-navy/70">{label}</dt>
      <dd className="flex flex-1 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-pale-sky/60">
          <div
            className={cn(
              "h-full rounded-full",
              value >= 70 ? "bg-gold" : value >= 40 ? "bg-frosted-blue" : "bg-glaucous",
            )}
            style={{ width: `${Math.max(2, value)}%` }}
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
