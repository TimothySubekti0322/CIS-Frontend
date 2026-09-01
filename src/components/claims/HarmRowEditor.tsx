"use client";

import { useState } from "react";
import type { ConfirmHarmPayload, HarmBreakdown } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { useConfirmHarm } from "@/lib/hooks/useClaims";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast } from "@/components/ui/Toast";

type SubScore = "publicSafety" | "institutionalTrust" | "economic" | "policyDisruption";

/**
 * The four editable sub-components, with the PRD 6.2.4 rubric each is scored
 * against. The rubric text is the per-field tooltip §5.5 asks for — a reviewer
 * overriding a number needs to know what the number is supposed to mean.
 */
const FIELDS: { key: SubScore; label: string; rubric: string }[] = [
  {
    key: "publicSafety",
    label: "Public safety",
    rubric:
      "How far acting on this claim could put people in physical danger — ignoring an evacuation order, refusing a safety measure, or obstructing emergency response.",
  },
  {
    key: "institutionalTrust",
    label: "Institutional trust",
    rubric:
      "How far the claim erodes confidence in the city, its data or its scientific advice, beyond disagreement with a single decision.",
  },
  {
    key: "economic",
    label: "Economic",
    rubric:
      "Direct financial consequences for residents or businesses if the claim is acted on — avoided rebates, cancelled works, mispriced decisions.",
  },
  {
    key: "policyDisruption",
    label: "Policy disruption",
    rubric:
      "How far the claim could delay, dilute or reverse a climate policy already in motion. Weighted lowest of the four, at 0.15.",
  },
];

type Draft = Record<SubScore, string>;

function draftFrom(harm: HarmBreakdown): Draft {
  return {
    publicSafety: String(harm.publicSafety),
    institutionalTrust: String(harm.institutionalTrust),
    economic: String(harm.economic),
    policyDisruption: String(harm.policyDisruption),
  };
}

/**
 * US23 (v1.5) — the Harm row's inline edit state, inside the Score Breakdown
 * panel. There is no separate "Harm Assessment" section any more: this is the
 * only place the four sub-scores can change.
 *
 * Three behaviours are load-bearing and easy to get wrong:
 *
 *  - **An empty submission is meaningful.** "I reviewed these and they are
 *    right" is a real answer that still records human confirmation, so Save is
 *    enabled with nothing changed.
 *  - **Only changed fields are sent.** An omitted sub-score keeps the AI's own
 *    classification rather than being rewritten with whatever the form
 *    happened to render.
 *  - **It is slow, and it rescores everything.** The request is proxied to the
 *    AI service, which recomputes H → ClaimScore → FinalClaimScore before
 *    replying with the whole claim — hence the loading state and the note.
 */
export function HarmRowEditor({
  claimId,
  harm,
  onDone,
}: {
  claimId: string;
  harm: HarmBreakdown;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirmHarm(claimId);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(harm));

  const original: Record<SubScore, number> = {
    publicSafety: harm.publicSafety,
    institutionalTrust: harm.institutionalTrust,
    economic: harm.economic,
    policyDisruption: harm.policyDisruption,
  };

  const outOfRange = FIELDS.some(({ key }) => {
    const n = Number(draft[key]);
    return draft[key] !== "" && (!Number.isFinite(n) || n < 0 || n > 100);
  });

  async function save() {
    const payload: ConfirmHarmPayload = {};
    for (const { key } of FIELDS) {
      const n = Number(draft[key]);
      if (draft[key] !== "" && Number.isFinite(n) && n !== original[key]) {
        payload[key] = n;
      }
    }
    try {
      await confirm.mutateAsync(payload);
      toast(strings.claims.harmConfirmed);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-pale-sky bg-mint-cream p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-regal-navy/50">
        {strings.claims.harmEditTitle}
      </p>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, rubric }) => (
          <div key={key} className="flex flex-col gap-1">
            <label
              htmlFor={`harm-${key}`}
              className="flex items-center gap-1 text-xs font-bold text-regal-navy"
            >
              {label}
              {harm.weights && (
                <span className="font-normal text-regal-navy/50">
                  ×{harm.weights[key].toFixed(2)}
                </span>
              )}
              <InfoTooltip content={rubric} label={`${label} rubric`} align="start" />
            </label>
            <input
              id={`harm-${key}`}
              type="number"
              min={0}
              max={100}
              value={draft[key]}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="h-9 rounded-lg border border-pale-sky bg-white px-3 text-sm tabular-nums text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-regal-navy/60">
        {outOfRange ? (
          <span className="text-danger">{strings.claims.harmRangeError}</span>
        ) : (
          strings.claims.harmEditSlow
        )}
      </p>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={confirm.isPending}>
          {strings.common.cancel}
        </Button>
        <Button
          size="sm"
          onClick={save}
          loading={confirm.isPending}
          disabled={outOfRange}
        >
          {strings.common.save}
        </Button>
      </div>
    </div>
  );
}
