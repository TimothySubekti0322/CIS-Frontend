import type { ClaimListParams } from "@/types/claim";
import type { PolicyListParams } from "@/types/policy";

/** Centralised TanStack Query keys. */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  claims: {
    generic: (params?: ClaimListParams) =>
      ["claims", "generic", params ?? {}] as const,
    synthetic: (params?: ClaimListParams) =>
      ["claims", "synthetic", params ?? {}] as const,
    genericDetail: (id: string) => ["claims", "generic", "detail", id] as const,
    syntheticDetail: (id: string) =>
      ["claims", "synthetic", "detail", id] as const,
  },
  policies: {
    list: (params?: PolicyListParams) => ["policies", "list", params ?? {}] as const,
    detail: (id: string) => ["policies", "detail", id] as const,
    matchmaking: (id: string) => ["policies", "matchmaking", id] as const,
  },
  alerts: {
    watchlist: ["alerts", "watchlist"] as const,
  },
  admin: {
    settings: ["admin", "settings"] as const,
  },
};
