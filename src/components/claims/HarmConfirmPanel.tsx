"use client";

import { useState } from "react";
import { CheckCircle2, SlidersHorizontal } from "lucide-react";
import type { ConfirmHarmPayload, HarmBreakdown } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { useConfirmHarm } from "@/lib/hooks/useClaims";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";

type SubScore = "publicSafety" | "institutionalTrust" | "economic" | "policyDisruption";

const FIELDS: { key: SubScore; label: string; weightKey: SubScore }[] = [
  { key: "publicSafety", label: "Public safety", weightKey: "publicSafety" },
  {
    key: "institutionalTrust",
    label: "Institutional trust",
    weightKey: "institutionalTrust",
  },
  { key: "economic", label: "Economic", weightKey: "economic" },
  {
    key: "policyDisruption",
    label: "Policy disruption",
    weightKey: "policyDisruption",
  },
];

/**
 * PRD 6.2.4 — an analyst confirms or overrides the AI's four Harm sub-scores.
 *
 * Two things make this worth its own panel rather than an inline edit:
 *
 *  - **An empty submission is meaningful.** "I reviewed these and they are
 *    right" is a real answer, and it still flips `humanConfirmed`. So the
 *    confirm button is enabled with nothing changed.
 *  - **It is slow.** The request is proxied to the AI service, which recomputes
 *    harm → claim_score → final_claim_score before replying, so the whole claim
 *    comes back rescored. Hence the loading state and the note below.
 *
 * Only changed fields are sent: an omitted sub-score keeps the AI's own
 * classification rather than being reset to whatever the form rendered.
 */
export function HarmConfirmPanel({
  claimId,
  harm,
}: {
  claimId: string;
  harm: HarmBreakdown;
}) {
  const { toast } = useToast();
  const confirm = useConfirmHarm(claimId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<SubScore, string>>({
    publicSafety: String(harm.publicSafety),
    institutionalTrust: String(harm.institutionalTrust),
    economic: String(harm.economic),
    policyDisruption: String(harm.policyDisruption),
  });

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

  async function submit() {
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
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-h3">{strings.claims.harmConfirmTitle}</h3>
          <p className="mt-1 max-w-xl text-xs text-regal-navy/60">
            {strings.claims.harmConfirmHint}
          </p>
        </div>
        {harm.humanConfirmed ? (
          <StatusPill
            tone="success"
            icon={<CheckCircle2 className="size-3" aria-hidden />}
          >
            {strings.claims.harmHumanConfirmed}
          </StatusPill>
        ) : (
          <StatusPill tone="warn">{strings.claims.harmAiOnly}</StatusPill>
        )}
      </div>

      {open ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map(({ key, label, weightKey }) => (
              <Field
                key={key}
                label={
                  harm.weights
                    ? `${label} (×${harm.weights[weightKey].toFixed(2)})`
                    : label
                }
                type="number"
                min={0}
                max={100}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            ))}
          </div>
          <p className="text-xs text-regal-navy/60">
            {strings.claims.harmConfirmSlow}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {strings.common.cancel}
            </Button>
            <Button
              onClick={submit}
              loading={confirm.isPending}
              disabled={outOfRange}
            >
              {strings.claims.harmConfirmAction}
            </Button>
          </div>
        </>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          {strings.claims.harmReview}
        </Button>
      )}
    </Card>
  );
}
