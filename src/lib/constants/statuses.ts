import type { ClaimStatus } from "@/types/claim";
import type { PillTone } from "@/components/ui/StatusPill";
import { strings } from "./strings";

export interface StatusMeta {
  value: ClaimStatus;
  label: string;
  /** Tone token for the shared <StatusPill /> component. */
  tone: PillTone;
}

/** Unified 4-value claim status model (PRD v1.3 §4 US1). */
export const CLAIM_STATUSES: StatusMeta[] = [
  { value: "unreviewed", label: strings.status.unreviewed, tone: "neutral" },
  { value: "active", label: strings.status.active, tone: "success" },
  { value: "inactive", label: strings.status.inactive, tone: "muted" },
  { value: "action_taken", label: strings.status.action_taken, tone: "info" },
];

export const CLAIM_STATUS_MAP: Record<ClaimStatus, StatusMeta> = Object.fromEntries(
  CLAIM_STATUSES.map((s) => [s.value, s]),
) as Record<ClaimStatus, StatusMeta>;

/** F1 page-level status filter tabs (PRD US1) — "All Status" + the 4 statuses. */
export const STATUS_FILTER_TABS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "all", label: strings.common.allStatus },
  ...CLAIM_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];
