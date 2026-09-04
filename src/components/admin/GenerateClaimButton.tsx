"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useGenerateGenericClaim } from "@/lib/hooks/useAdminTools";
import { useTopics } from "@/lib/hooks/useTopics";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

/**
 * The "Generate Generic Claim" MVP/test utility, styled distinctly as a
 * utility action.
 *
 * The backend proxies this to the AI service, which owns the `claims` table,
 * and waits for the answer — so a 503 here means the AI service is
 * unconfigured or unreachable, not that the click failed.
 */
export function GenerateClaimButton() {
  const { mutateAsync, isPending } = useGenerateGenericClaim();
  const { data: topics } = useTopics();
  const { toast } = useToast();
  const [topicId, setTopicId] = useState("");

  async function generate() {
    try {
      const result = await mutateAsync(topicId || undefined);
      toast(result.claimStatement ?? strings.admin.generated);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-glaucous bg-glaucous-soft/40 p-5">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-glaucous" aria-hidden />
        <h2 className="text-h3">{strings.admin.testUtilsTitle}</h2>
      </div>
      <p className="mt-1 text-sm text-regal-navy/70">
        {strings.admin.generateClaimDesc}
      </p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-glaucous">
        {strings.admin.generateClaimUtility}
      </p>

      <label className="mt-4 flex flex-col gap-1 text-sm font-bold text-regal-navy">
        {strings.admin.generateClaimTopic}
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="h-10 rounded-lg border border-pale-sky bg-white px-3 text-sm font-normal text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
        >
          <option value="">{strings.admin.generateClaimAnyTopic}</option>
          {(topics ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <Button variant="utility" className="mt-4" loading={isPending} onClick={generate}>
        {strings.admin.generateClaim}
      </Button>
    </div>
  );
}
