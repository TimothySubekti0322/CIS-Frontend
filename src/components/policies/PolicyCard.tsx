"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Download, FileText } from "lucide-react";
import type { Policy } from "@/types/policy";
import { ApiError } from "@/types/common";
import { formatDate, formatMonthYear } from "@/lib/utils";
import { isMockMode } from "@/lib/config";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { useDownloadPolicyFile, usePolicyProcessing } from "@/lib/hooks/usePolicies";
import { PolicyStatusPill } from "./PolicyStatusPill";
import { ProcessingBadge } from "./ProcessingBadge";

/** Policy card, reused on the policy list and "See all" pages. */
export function PolicyCard({ policy }: { policy: Policy }) {
  const router = useRouter();
  const { toast } = useToast();
  const download = useDownloadPolicyFile();

  // Keep polling while this card shows an in-flight matchmaking badge.
  usePolicyProcessing(policy.id, policy.isProcessing);

  const href = `/policies/${policy.id}`;

  async function onDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (isMockMode) {
      toast(strings.policies.downloadMockUnavailable, "error");
      return;
    }
    try {
      await download.mutateAsync({ id: policy.id, fileName: policy.fileName });
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : strings.policies.downloadFailed,
        "error",
      );
    }
  }

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
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <ProcessingBadge status={policy.processingStatus} />
          <PolicyStatusPill status={policy.status} />
        </div>
      </div>

      <p className="line-clamp-2 flex-1 text-sm font-bold text-regal-navy">
        {policy.name}
      </p>

      <div className="space-y-1 text-xs text-regal-navy/60">
        {/* `monthYear` is preformatted by the backend; fall back to the date. */}
        <p>{policy.monthYear ?? formatMonthYear(policy.rolledOutDate)}</p>
        {policy.createdAt && (
          <p className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden />
            {strings.claims.created}: {formatDate(policy.createdAt)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-pale-sky pt-3">
        <span className="text-xs text-regal-navy/50">
          {policy.linkedClaimCount.toLocaleString()} {strings.policies.linkedClaims}
        </span>
        {policy.fileName && (
          <IconButton
            label={strings.common.download}
            onClick={onDownload}
            disabled={download.isPending}
          >
            <Download className="size-4" aria-hidden />
          </IconButton>
        )}
      </div>
    </Card>
  );
}
