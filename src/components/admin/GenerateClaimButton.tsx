"use client";

import { FlaskConical } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { useGenerateGenericClaim } from "@/lib/hooks/useClaims";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

/**
 * F4 — MVP/test utility (PRD US33, §5.6). Styled distinctly as a utility button
 * (Glaucous). Inserts one fully-populated generic claim and bumps the S1
 * "last fetched" timestamp.
 */
export function GenerateClaimButton() {
  const { mutateAsync, isPending } = useGenerateGenericClaim();
  const { toast } = useToast();

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
      <Button
        variant="utility"
        className="mt-4"
        loading={isPending}
        onClick={async () => {
          try {
            await mutateAsync();
            toast(strings.admin.generated);
          } catch {
            toast(strings.errors.generic, "error");
          }
        }}
      >
        {strings.admin.generateClaim}
      </Button>
    </div>
  );
}
