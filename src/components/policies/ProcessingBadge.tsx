import { AlertTriangle, Loader2, MinusCircle } from "lucide-react";
import type { PolicyProcessingStatus } from "@/types/policy";
import { strings } from "@/lib/constants/strings";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Matchmaking state on a policy card. Five states, not two:
 * `pending`/`processing` are both "in flight", `failed` is retryable via
 * /rematch, and `skipped` means no AI service is configured — not an error.
 * `completed` renders nothing; the rollout status pill takes over.
 */
export function ProcessingBadge({ status }: { status: PolicyProcessingStatus }) {
  switch (status) {
    case "pending":
      return (
        <StatusPill tone="warn" icon={<Loader2 className="size-3 animate-spin" aria-hidden />}>
          {strings.policies.processingPending}
        </StatusPill>
      );
    case "processing":
      return (
        <StatusPill tone="warn" icon={<Loader2 className="size-3 animate-spin" aria-hidden />}>
          {strings.policies.processing}
        </StatusPill>
      );
    case "failed":
      return (
        <StatusPill tone="danger" icon={<AlertTriangle className="size-3" aria-hidden />}>
          {strings.policies.processingFailed}
        </StatusPill>
      );
    case "skipped":
      return (
        <StatusPill tone="muted" icon={<MinusCircle className="size-3" aria-hidden />}>
          {strings.policies.processingSkipped}
        </StatusPill>
      );
    default:
      return null;
  }
}
