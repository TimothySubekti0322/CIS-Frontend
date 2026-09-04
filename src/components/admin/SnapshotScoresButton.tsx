"use client";

import { CameraIcon } from "lucide-react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useSnapshotScores } from "@/lib/hooks/useAdminTools";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

/**
 * Forces a score snapshot for every watched claim, so the Alert-page chart
 * has history without waiting for the hourly cron. Returns 0 when the
 * watchlist is empty, which is a valid answer rather than a failure.
 */
export function SnapshotScoresButton() {
  const { mutateAsync, isPending } = useSnapshotScores();
  const { toast } = useToast();

  async function run() {
    try {
      const captured = await mutateAsync();
      toast(`${captured} ${strings.admin.snapshotDone}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-glaucous bg-glaucous-soft/40 p-5">
      <div className="flex items-center gap-2">
        <CameraIcon className="size-4 text-glaucous" aria-hidden />
        <h2 className="text-h3">{strings.admin.snapshotTitle}</h2>
      </div>
      <p className="mt-1 text-sm text-regal-navy/70">{strings.admin.snapshotDesc}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-glaucous">
        {strings.admin.generateClaimUtility}
      </p>
      <Button variant="utility" className="mt-4" loading={isPending} onClick={run}>
        {strings.admin.snapshotAction}
      </Button>
    </div>
  );
}
