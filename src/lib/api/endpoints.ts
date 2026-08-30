/**
 * Every route the CIS backend exposes, transcribed from the API runbook.
 *
 * Paths are written WITHOUT the `/api/v1` prefix — the client prepends
 * `config.apiPrefix`. The two health probes sit outside that prefix and say so
 * with `prefix: "none"`.
 *
 * `:param` segments are substituted by `buildPath()`.
 */

export interface EndpointDef {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  /** `"none"` mounts the path at the API root, bypassing `/api/v1`. */
  prefix?: "none";
  /** Public routes never attach a Bearer token or attempt a refresh-retry. */
  public?: boolean;
}

function def<T extends EndpointDef>(endpoint: T): T {
  return endpoint;
}

export const ENDPOINTS = {
  /** Email + password, short-lived JWT, rotating single-use refresh token. */
  auth: {
    register: def({ method: "POST", path: "/auth/register", public: true }),
    login: def({ method: "POST", path: "/auth/login", public: true }),
    /** The presented refresh token is revoked as part of the exchange. */
    refresh: def({ method: "POST", path: "/auth/refresh", public: true }),
    me: def({ method: "GET", path: "/auth/me" }),
    /** Revokes every refresh token for the user; access tokens stay valid. */
    logout: def({ method: "POST", path: "/auth/logout" }),
  },

  /** Read-only — topics are owned and written by the AI service. */
  topics: {
    list: def({ method: "GET", path: "/topics" }),
    get: def({ method: "GET", path: "/topics/:id" }),
  },

  /** F1 — Claim Repository Bank. */
  claims: {
    /** The whole F1 page in one call; both sections always return. */
    repository: def({ method: "GET", path: "/claims/repository" }),
    /** The "See all" list, paginated. */
    list: def({ method: "GET", path: "/claims" }),
    get: def({ method: "GET", path: "/claims/:id" }),
    statements: def({ method: "GET", path: "/claims/:id/statements" }),
    topAccounts: def({ method: "GET", path: "/claims/:id/top-accounts" }),
    policies: def({ method: "GET", path: "/claims/:id/policies" }),
    scoreHistory: def({ method: "GET", path: "/claims/:id/score-history" }),
    /** Writes `cis_claim_reviews`, never the AI service's `claims.status`. */
    updateStatus: def({ method: "PUT", path: "/claims/:id/status" }),
  },

  /** F2 — Public Policy Bank. */
  policies: {
    list: def({ method: "GET", path: "/policies" }),
    /** Distinct rolled-out years, descending — powers the year chips. */
    years: def({ method: "GET", path: "/policies/years" }),
    /** multipart/form-data: file, name, rolled_out_date, description. */
    create: def({ method: "POST", path: "/policies" }),
    get: def({ method: "GET", path: "/policies/:id" }),
    /** 307-redirects to a signed URL, or streams bytes on the local driver. */
    file: def({ method: "GET", path: "/policies/:id/file" }),
    /** Lightweight polling target for the "Processing" badge. */
    processing: def({ method: "GET", path: "/policies/:id/processing" }),
    /** Re-queues matchmaking after a `failed` status; resets attempts. */
    rematch: def({ method: "POST", path: "/policies/:id/rematch" }),
    update: def({ method: "PATCH", path: "/policies/:id" }),
    remove: def({ method: "DELETE", path: "/policies/:id" }),
  },

  /** F3 — Alert Page. Existing/Generic claims only. */
  alerts: {
    list: def({ method: "GET", path: "/alerts" }),
    add: def({ method: "POST", path: "/alerts" }),
    remove: def({ method: "DELETE", path: "/alerts/:claimId" }),
    /** Server-persisted "Chart" checkbox driving `GET /alerts/chart`. */
    setChartVisible: def({ method: "PATCH", path: "/alerts/:claimId/chart" }),
    chart: def({ method: "GET", path: "/alerts/chart" }),
  },

  /** F4 — Admin settings and utilities. No roles exist in this build. */
  settings: {
    list: def({ method: "GET", path: "/settings" }),
    getAlertThreshold: def({ method: "GET", path: "/settings/alert-threshold" }),
    /** Applies globally and takes effect at read time, immediately. */
    updateAlertThreshold: def({ method: "PUT", path: "/settings/alert-threshold" }),
  },

  admin: {
    /** Proxies to the AI service — this backend never writes `claims`. */
    generateGenericClaim: def({
      method: "POST",
      path: "/admin/generate-generic-claim",
    }),
    /** Forces an F3 chart-history snapshot without waiting for the cron job. */
    snapshotScores: def({ method: "POST", path: "/admin/snapshot-scores" }),
  },

  /** Ops probes — mounted at the API root, not under `/api/v1`. */
  health: {
    live: def({ method: "GET", path: "/health", prefix: "none", public: true }),
    ready: def({
      method: "GET",
      path: "/health/ready",
      prefix: "none",
      public: true,
    }),
  },
} as const;

/**
 * Machine-to-machine, called by the AI service — NOT by this frontend.
 * Listed for completeness so the contract lives in one place.
 *
 * Auth is `X-Internal-Key`, enforced only when `INTERNAL_API_KEY` is set on
 * both sides. `:id` is the `cis_policies.id`, not the AI service's policy id.
 */
export const INTERNAL_ENDPOINTS = {
  matchmakingResult: def({
    method: "POST",
    path: "/internal/policies/:id/matchmaking-result",
    public: true,
  }),
} as const;

/**
 * Substitute `:param` segments and append a query string.
 *
 * Array values are joined with commas (`topic_ids=a,b`), which is what the
 * backend's multi-select filters expect — not repeated keys.
 */
export function buildPath(
  path: string,
  params?: Record<string, string | number>,
  query?: Record<string, unknown>,
): string {
  let result = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }
  if (query) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        qs.set(key, value.map(String).join(","));
      } else {
        qs.set(key, String(value));
      }
    }
    const s = qs.toString();
    if (s) result += `?${s}`;
  }
  return result;
}
