"use client";

import { AlertTriangle } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { usePolicyUploadWarnMb } from "@/lib/hooks/useSettings";

const BYTES_PER_MB = 1024 * 1024;

/**
 * A warning that a policy document is unusually large.
 *
 * **A warning, never a block.** Policy uploads have no size limit and the
 * backend enforces none, so this exists only to tell an uploader a file is
 * unusual before they wait on it. Nothing here disables a submit button, and
 * the threshold is read from the admin setting rather than baked in — an
 * operator who raises it means it.
 */
export function LargeFileWarning({ file }: { file: File | null }) {
  const warnMb = usePolicyUploadWarnMb();
  if (!file || warnMb === null || warnMb <= 0) return null;

  const sizeMb = file.size / BYTES_PER_MB;
  if (sizeMb <= warnMb) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-gold bg-gold-soft px-3 py-2 text-xs text-regal-navy">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {strings.policies.largeFileWarning
          .replace("{size}", sizeMb.toFixed(1))
          .replace("{limit}", String(warnMb))}
      </span>
    </p>
  );
}
