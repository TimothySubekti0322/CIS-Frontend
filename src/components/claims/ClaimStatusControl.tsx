"use client";

import { useState } from "react";
import type { ClaimStatus } from "@/types/claim";
import { CLAIM_STATUSES } from "@/lib/constants/statuses";
import { cn } from "@/lib/utils";
import { useUpdateClaimStatus } from "@/lib/hooks/useClaims";
import { useToast } from "@/components/ui/Toast";

export interface ClaimStatusControlProps {
  claimId: string;
  value: ClaimStatus;
  /** `sm` on cards, `md` on detail pages. */
  size?: "sm" | "md";
  className?: string;
}

/** Unified 4-value status dropdown (PRD v1.3 US1). Persists on change. */
export function ClaimStatusControl({
  claimId,
  value,
  size = "sm",
  className,
}: ClaimStatusControlProps) {
  const { mutateAsync, isPending } = useUpdateClaimStatus();
  const { toast } = useToast();
  const [local, setLocal] = useState<ClaimStatus>(value);

  async function onChange(next: ClaimStatus) {
    const prev = local;
    setLocal(next);
    try {
      await mutateAsync({ id: claimId, status: next });
    } catch {
      setLocal(prev);
      toast("Could not update status", "error");
    }
  }

  return (
    <select
      aria-label="Claim status"
      value={local}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as ClaimStatus)}
      className={cn(
        "rounded-lg border border-pale-sky bg-white font-bold text-regal-navy focus-visible:border-sea-green focus-visible:outline-none disabled:opacity-60",
        size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm",
        className,
      )}
    >
      {CLAIM_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
