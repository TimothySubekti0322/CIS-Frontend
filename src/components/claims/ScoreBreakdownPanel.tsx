"use client";

import type { ReactNode } from "react";
import type { HarmEdit, ScoreBreakdown } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { cn, formatDateTime } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

/**
 * The full transparent score breakdown. Every component the backend sends is
 * displayed alongside FinalClaimScore — the collapsed number is never shown
 * alone (PRD 6.5).
 *
 * Weights are read from the payload, not hardcoded, so a backend re-weighting
 * shows up here without a frontend change. The same is true of the v1.5
 * formula sentence: it is generated from the same constants as the arithmetic,
 * so the explanation cannot drift away from the number it explains.
 *
 * The Harm sub-scores are displayed read-only: R, V, F, H and EI are all
 * AI-owned here, and any prior human override still shows through the audit
 * trail below.
 */
export function ScoreBreakdownPanel({
  score,
}: {
  score: ScoreBreakdown;
}) {
  const weights = score.weights;
  const harm = score.harmBreakdown;
  // Presence of the audit trail — not `humanConfirmed`, which an empty
  // confirmation also sets — is what marks the value as human-overridden.
  const harmEdit = harm?.edit ?? null;

  return (
    <div className="space-y-4 rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-h3">{strings.claims.scoreBreakdown}</h3>
          {/* US23's info-tooltip. The sentence is served; the hardcoded copy is
              only reached by a backend that predates v1.5. */}
          <InfoTooltip
            content={score.formula ?? strings.claims.scoreFormulaFallback}
            label={strings.claims.scoreFormulaLabel}
            align="start"
          />
        </div>
        {score.isDormant && (
          <StatusPill tone="neutral">{strings.claims.dormant}</StatusPill>
        )}
      </div>

      <dl className="space-y-2.5">
        <ScoreRow
          label="Reach & Spread (R)"
          value={score.reach}
          weight={weights?.reach}
        />
        <ScoreRow
          label="Velocity (V)"
          value={score.velocity}
          weight={weights?.velocity}
        />
        <ScoreRow
          label="Falseness Confidence (F)"
          value={score.falseness}
          weight={weights?.falseness}
        />

        <ScoreRow
          label="Harm Severity (H)"
          value={score.harm}
          weight={weights?.harm}
          edited={Boolean(harmEdit)}
        />

        <ScoreRow
          label={strings.claims.eiSupporting}
          value={score.emotionalIntensity}
          weight={weights?.emotionalIntensity}
        />
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
            edited={Boolean(harmEdit)}
            editedLabel={strings.claims.harmEditedTag}
            className="mt-1"
          />
        </div>
      </div>

      {harm && (
        <div className="border-t border-pale-sky pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-regal-navy/50">
              {strings.claims.harmBreakdown}
            </p>
            {harmEdit ? (
              <StatusPill tone="info">{strings.claims.harmEdited}</StatusPill>
            ) : harm.humanConfirmed ? (
              <StatusPill tone="success">
                {strings.claims.harmHumanConfirmed}
              </StatusPill>
            ) : null}
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
          {harmEdit && <HarmEditTrail edit={harmEdit} />}
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

/**
 * US23's audit trail, rendered under the sub-scores once a human has
 * overridden them. `previous` holds the AI's original classification, so the
 * page — not only the audit table — can answer what the AI itself said.
 */
function HarmEditTrail({ edit }: { edit: HarmEdit }) {
  const previous = edit.previous;
  return (
    <div className="mt-3 rounded-lg bg-frosted-blue-soft p-3">
      <p className="text-xs text-regal-navy/70">
        {strings.claims.harmEditedBy}{" "}
        <span className="font-bold">{edit.editedBy ?? "a reviewer"}</span>
        {edit.editedAt && <> · {formatDateTime(edit.editedAt)}</>}
      </p>
      {previous && (
        <p className="mt-1 text-xs text-regal-navy/60">
          {strings.claims.harmEditedPrevious}: {formatPrevious(previous.publicSafety)}
          {" · "}
          {formatPrevious(previous.institutionalTrust)}
          {" · "}
          {formatPrevious(previous.economic)}
          {" · "}
          {formatPrevious(previous.policyDisruption)}
          {previous.harmScore !== null && <> → H {previous.harmScore.toFixed(1)}</>}
        </p>
      )}
    </div>
  );
}

function formatPrevious(value: number | null): string {
  return value === null ? "—" : value.toFixed(0);
}

function ScoreRow({
  label,
  value,
  weight,
  edited,
  action,
}: {
  label: string;
  value: number;
  weight?: number;
  /** Marks the row as human-overridden (US23). */
  edited?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <dt className="flex w-44 shrink-0 items-center gap-1 text-sm text-regal-navy/70">
        <span>
          {label}
          {weight !== undefined && (
            <span className="ml-1 text-xs text-regal-navy/40">
              ×{weight.toFixed(2)}
            </span>
          )}
        </span>
        {action}
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
        <span className="flex w-10 items-center justify-end gap-1 text-right text-sm font-bold tabular-nums">
          {value.toFixed(0)}
          {edited && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-regal-navy/60"
              title={strings.claims.harmEditedTag}
            />
          )}
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
