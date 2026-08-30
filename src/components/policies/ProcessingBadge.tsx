import { Loader2 } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { StatusPill } from "@/components/ui/StatusPill";

/** Shown on a policy while the AI matchmaking job runs (PRD US42, §5.5). */
export function ProcessingBadge() {
  return (
    <StatusPill
      tone="warn"
      icon={<Loader2 className="size-3 animate-spin" aria-hidden />}
    >
      {strings.policies.processing}
    </StatusPill>
  );
}
