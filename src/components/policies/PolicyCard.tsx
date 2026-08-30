"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Download, FileText } from "lucide-react";
import type { Policy } from "@/types/policy";
import { formatDate, formatMonthYear } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { useMatchmakingStatus } from "@/lib/hooks/usePolicies";
import { PolicyStatusPill } from "./PolicyStatusPill";
import { ProcessingBadge } from "./ProcessingBadge";

/** Policy card (PRD US37). Reused on the F2 list and "See all" pages. */
export function PolicyCard({ policy }: { policy: Policy }) {
  const router = useRouter();
  const { toast } = useToast();
  const isProcessing = policy.processing === "processing";

  // Keep polling the matchmaking job while this card shows "Processing" (US42).
  useMatchmakingStatus(policy.id, isProcessing);

  const href = `/policies/${policy.id}`;

  return (
    <Card
      interactive
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="flex h-full flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <FileText className="size-5 shrink-0 text-glaucous" aria-hidden />
        {isProcessing ? <ProcessingBadge /> : <PolicyStatusPill status={policy.status} />}
      </div>

      <p className="line-clamp-2 flex-1 text-sm font-bold text-regal-navy">
        {policy.name}
      </p>

      <div className="space-y-1 text-xs text-regal-navy/60">
        <p>{formatMonthYear(policy.rolledOutDate)}</p>
        <p className="inline-flex items-center gap-1">
          <CalendarClock className="size-3.5" aria-hidden />
          {strings.claims.created}: {formatDate(policy.createdAt)}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-pale-sky pt-3">
        <span className="text-xs text-regal-navy/50">
          {policy.linkedGenericCount + policy.linkedSyntheticCount} linked claims
        </span>
        <IconButton
          label={strings.common.download}
          onClick={(e) => {
            e.stopPropagation();
            toast(`Downloading ${policy.fileName}`);
          }}
        >
          <Download className="size-4" aria-hidden />
        </IconButton>
      </div>
    </Card>
  );
}
