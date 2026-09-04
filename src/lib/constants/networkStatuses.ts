import type { PillTone } from "@/components/ui/StatusPill";
import type {
  AllowlistCategory,
  ConfidenceBand,
  NetworkReviewStatus,
  NetworkSort,
} from "@/types/network";
import { strings } from "./strings";

/**
 * This review-status set is **deliberately not** the four-value claim status
 * model. A network assessment is an evidentiary judgment about a set of real
 * accounts, so "we assessed this and concluded it was organic" (Dismissed —
 * False Positive) has to be recordable distinctly from "we are no longer
 * tracking it". Collapsing them would lose the signal that trains the
 * allowlist and make the same false positive re-triageable indefinitely.
 */
export interface NetworkStatusMeta {
  value: NetworkReviewStatus;
  label: string;
  tone: PillTone;
}

export const NETWORK_STATUSES: NetworkStatusMeta[] = [
  { value: "unreviewed", label: strings.networkStatus.unreviewed, tone: "neutral" },
  { value: "under_review", label: strings.networkStatus.under_review, tone: "warn" },
  { value: "confirmed", label: strings.networkStatus.confirmed, tone: "danger" },
  {
    value: "dismissed_false_positive",
    label: strings.networkStatus.dismissed_false_positive,
    tone: "muted",
  },
  { value: "action_taken", label: strings.networkStatus.action_taken, tone: "info" },
];

export const NETWORK_STATUS_MAP: Record<NetworkReviewStatus, NetworkStatusMeta> =
  Object.fromEntries(NETWORK_STATUSES.map((s) => [s.value, s])) as Record<
    NetworkReviewStatus,
    NetworkStatusMeta
  >;

/** Tab bar: All Status + the five review statuses. */
export const NETWORK_STATUS_TABS: {
  value: NetworkReviewStatus | "all";
  label: string;
}[] = [
  { value: "all", label: strings.common.allStatus },
  ...NETWORK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

/**
 * Confidence is computed from the score **and** SignalBreadth, never set by a
 * human, and is an axis orthogonal to review status — the two are never
 * combined into a single condition.
 */
export const CONFIDENCE_BANDS: {
  value: ConfidenceBand;
  label: string;
  tone: PillTone;
}[] = [
  { value: "high", label: strings.confidence.high, tone: "danger" },
  { value: "medium", label: strings.confidence.medium, tone: "warn" },
  { value: "low", label: strings.confidence.low, tone: "muted" },
];

export const CONFIDENCE_MAP = Object.fromEntries(
  CONFIDENCE_BANDS.map((b) => [b.value, b]),
) as Record<ConfidenceBand, (typeof CONFIDENCE_BANDS)[number]>;

export const NETWORK_SORTS: { value: NetworkSort; label: string }[] = [
  { value: "score", label: strings.networks.sortScore },
  { value: "detected_at", label: strings.networks.sortDetected },
  { value: "accounts", label: strings.networks.sortAccounts },
  { value: "posts", label: strings.networks.sortPosts },
  { value: "recurrences", label: strings.networks.sortRecurrences },
];

/**
 * The five signal families. Order is fixed so the panel, the graph
 * legend and the report all read the same way.
 */
export const SIGNAL_ORDER = ["SY", "DU", "CO", "PR", "AU"] as const;

export const SIGNAL_LABELS: Record<string, string> = {
  SY: strings.signals.SY,
  DU: strings.signals.DU,
  CO: strings.signals.CO,
  PR: strings.signals.PR,
  AU: strings.signals.AU,
};

/** Required category on any allowlist entry. */
export const ALLOWLIST_CATEGORIES: {
  value: AllowlistCategory;
  label: string;
}[] = [
  { value: "ngo", label: strings.allowlist.ngo },
  { value: "newsroom", label: strings.allowlist.newsroom },
  { value: "campaign_group", label: strings.allowlist.campaign_group },
  { value: "government", label: strings.allowlist.government },
  { value: "union", label: strings.allowlist.union },
  { value: "self_exclusion", label: strings.allowlist.self_exclusion },
  { value: "other", label: strings.allowlist.other },
];

export const ALLOWLIST_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  ALLOWLIST_CATEGORIES.map((c) => [c.value, c.label]),
);

export const PHRASE_CATEGORIES = [
  { value: "slogan", label: "Slogan" },
  { value: "hashtag", label: "Hashtag" },
  { value: "policy_name", label: "Policy name" },
  { value: "press_release", label: "Press release" },
  { value: "other", label: "Other" },
];

/** The minimum length required for a status-change reason. */
export const MIN_REVIEW_REASON = 20;

/** The minimum an allowlist reason must reach. */
export const MIN_ALLOWLIST_REASON = 10;
