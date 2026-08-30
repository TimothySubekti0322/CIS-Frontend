import type {
  ClaimListParams,
  ClaimRepositoryParams,
  ScoreHistoryParams,
  StatementListParams,
} from "@/types/claim";
import type { AlertChartParams, WatchlistParams } from "@/types/alert";
import type { PolicyListParams } from "@/types/policy";

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
  },
  settings: {
    all: ["settings"] as const,
    list: ["settings", "list"] as const,
    alertThreshold: ["settings", "alert-threshold"] as const,
  },
};
