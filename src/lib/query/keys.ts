import type {
  ClaimListParams,
  ClaimRepositoryParams,
  ScoreHistoryParams,
  StatementListParams,
} from "@/types/claim";
import type { AlertChartParams, WatchlistParams } from "@/types/alert";
import type { OverviewParams } from "@/types/overview";
import type { PolicyListParams } from "@/types/policy";
import type {
  AccountAnnexParams,
  AllowlistParams,
  AuditLogParams,
  DetectionRunListParams,
  NetworkListParams,
  OfftopicClusterParams,
} from "@/types/network";

/**
 * Centralised TanStack Query keys.
 *
 * Every key starts with its resource name so a mutation can invalidate a whole
 * resource with `{ queryKey: ["claims"] }` without listing each variant.
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  /** F6 — the whole page is one query; the topic modal is a child of it. */
  overview: {
    all: ["overview"] as const,
    page: (params?: OverviewParams) => ["overview", "page", params ?? {}] as const,
    topic: (id: string) => ["overview", "topic", id] as const,
  },
  topics: {
    all: ["topics"] as const,
    list: ["topics", "list"] as const,
    detail: (id: string) => ["topics", "detail", id] as const,
  },
  claims: {
    all: ["claims"] as const,
    repository: (params?: ClaimRepositoryParams) =>
      ["claims", "repository", params ?? {}] as const,
    list: (params?: ClaimListParams) => ["claims", "list", params ?? {}] as const,
    detail: (id: string) => ["claims", "detail", id] as const,
    statements: (id: string, params?: StatementListParams) =>
      ["claims", "detail", id, "statements", params ?? {}] as const,
    topAccounts: (id: string) => ["claims", "detail", id, "top-accounts"] as const,
    policies: (id: string) => ["claims", "detail", id, "policies"] as const,
    scoreHistory: (id: string, params?: ScoreHistoryParams) =>
      ["claims", "detail", id, "score-history", params ?? {}] as const,
  },
  policies: {
    all: ["policies"] as const,
    list: (params?: PolicyListParams) => ["policies", "list", params ?? {}] as const,
    years: ["policies", "years"] as const,
    detail: (id: string) => ["policies", "detail", id] as const,
    processing: (id: string) => ["policies", "processing", id] as const,
  },
  alerts: {
    all: ["alerts"] as const,
    list: (params?: WatchlistParams) => ["alerts", "list", params ?? {}] as const,
    chart: (params?: AlertChartParams) => ["alerts", "chart", params ?? {}] as const,
    /** US71's badge. Deliberately outside `alerts.list`/`chart` so a watchlist
     *  refetch does not re-read the counter, and vice versa. */
    notifications: ["alerts", "notifications"] as const,
  },
  settings: {
    all: ["settings"] as const,
    list: ["settings", "list"] as const,
    alertThreshold: ["settings", "alert-threshold"] as const,
    /** The F4 dynamic-parameter catalog. One key: every write returns the
     *  whole refreshed catalog, so there is nothing to key per section. */
    parameters: ["settings", "parameters"] as const,
    history: (params?: { key?: string; page?: number }) =>
      ["settings", "history", params ?? {}] as const,
    detector: ["settings", "detector"] as const,
    detectorRanges: ["settings", "detector", "ranges"] as const,
    detectorHistory: ["settings", "detector", "history"] as const,
    cityTimezone: ["settings", "city-timezone"] as const,
    cities: ["settings", "cities"] as const,
  },
  /** F5 — every key under one resource so one mutation can invalidate the lot. */
  networks: {
    all: ["networks"] as const,
    list: (params?: NetworkListParams) =>
      ["networks", "list", params ?? {}] as const,
    detail: (id: string) => ["networks", "detail", id] as const,
    reviewLog: (id: string) => ["networks", "detail", id, "review-log"] as const,
    graph: (id: string) => ["networks", "detail", id, "graph"] as const,
    timeline: (id: string) => ["networks", "detail", id, "timeline"] as const,
    content: (id: string) => ["networks", "detail", id, "content"] as const,
    accounts: (id: string, params?: AccountAnnexParams) =>
      ["networks", "detail", id, "accounts", params ?? {}] as const,
    account: (id: string, accountId: string) =>
      ["networks", "detail", id, "accounts", accountId] as const,
    reports: (id: string) => ["networks", "detail", id, "reports"] as const,
  },
  detection: {
    all: ["detection"] as const,
    runs: (params?: DetectionRunListParams) =>
      ["detection", "runs", params ?? {}] as const,
    run: (id: string) => ["detection", "runs", id] as const,
    offtopic: (params?: OfftopicClusterParams) =>
      ["detection", "offtopic", params ?? {}] as const,
    offtopicRates: ["detection", "offtopic", "rates"] as const,
    dismissals: (params?: { from?: string; to?: string; page?: number }) =>
      ["detection", "dismissals", params ?? {}] as const,
    dismissalSummary: (windowDays: number) =>
      ["detection", "dismissals", "summary", windowDays] as const,
    exportAudit: (params?: AuditLogParams) =>
      ["detection", "export-audit", params ?? {}] as const,
  },
  allowlist: {
    all: ["allowlist"] as const,
    list: (params?: AllowlistParams) => ["allowlist", "list", params ?? {}] as const,
    categories: ["allowlist", "categories"] as const,
    phrases: (params?: { q?: string; page?: number }) =>
      ["allowlist", "phrases", params ?? {}] as const,
  },
};
