"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useToggleWatchlist } from "@/lib/hooks/useAlerts";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface BellButtonProps {
  claimId: string;
  claimStatement: string;
  onWatchlist: boolean;
  className?: string;
}

/**
 * Add/remove a claim from the F3 Alert watchlist (PRD US14).
 * Filled bell = on the watchlist, outline bell = not — distinguishable by
 * icon shape, not colour alone (PRD §5.6). Always confirms first.
 */
export function BellButton({
  claimId,
  claimStatement,
  onWatchlist,
  className,
}: BellButtonProps) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useToggleWatchlist();
  const { toast } = useToast();

  async function confirm() {
    try {
      await mutateAsync({ claimId, add: !onWatchlist });
      toast(onWatchlist ? strings.bell.removed : strings.bell.added);
      setOpen(false);
    } catch (err) {
      // 422 means a Synthetic claim was submitted — only Existing claims can
      // be watched. The server's message is the clearest explanation.
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={onWatchlist ? strings.bell.removeTitle : strings.bell.addTitle}
        aria-pressed={onWatchlist}
        title={onWatchlist ? strings.bell.removeTitle : strings.bell.addTitle}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg transition-colors",
          onWatchlist
            ? "bg-sea-green-soft text-sea-green"
            : "text-glaucous hover:bg-pale-sky/50",
          className,
        )}
      >
        {onWatchlist ? (
          <BellRing className="size-4" aria-hidden />
        ) : (
          <Bell className="size-4" aria-hidden />
        )}
      </button>

      <ConfirmDialog
        open={open}
        title={onWatchlist ? strings.bell.removeTitle : strings.bell.addTitle}
        body={
          <>
            {onWatchlist ? strings.bell.removeBody : strings.bell.addBody}
            <span className="mt-2 block rounded-md bg-mint-cream p-2 text-xs text-regal-navy/70">
              “{claimStatement}”
            </span>
          </>
        }
        confirmLabel={onWatchlist ? strings.bell.remove : strings.bell.add}
        destructive={onWatchlist}
        loading={isPending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
