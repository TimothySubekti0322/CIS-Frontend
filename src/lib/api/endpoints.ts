/**
 * Every route the CIS backend exposes, transcribed from `docs/api/`.
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

  /**
   * F6 — Overview (PRD v1.5). The whole page in one call, mirroring
   * `GET /claims/repository`: three round trips to render one screen buys
   * nothing, and nothing here is stored, so every figure is computed on read.
   */
  overview: {
    /** `?limit` sizes the O3 leaderboard; the backend default is 5. */
    get: def({ method: "GET", path: "/overview" }),
    /** The O2 treemap's click-through modal. 404 for an unknown topic. */
    topic: def({ method: "GET", path: "/overview/topics/:id" }),
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
    /** Existing claims only. Proxied to the AI service, which rescores before
     *  replying, so the response IS the full `GET /claims/:id` payload — never
     *  re-fetch after a successful confirm. Runs on the long timeout. */
    confirmHarm: def({ method: "PUT", path: "/claims/:id/harm/confirm" }),
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
    /** Replaces the document in place, keeping id, ai_policy_id and every
     *  existing claim correlation — unlike DELETE + re-create, which loses all
     *  three. Re-queues matchmaking against the new document. */
    replaceFile: def({ method: "PUT", path: "/policies/:id/file" }),
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
    /** US71 — the sidebar counter badge. Poll it, or refresh on navigation. */
    notifications: def({ method: "GET", path: "/alerts/notifications" }),
    /** Clears THIS user's badge and row highlights. Call it AFTER rendering
     *  the rows you were handed — acknowledging is what makes the *next*
     *  render unhighlighted, so calling it first clears what the user was
     *  just told about. Answers the same payload as the GET. */
    acknowledge: def({
      method: "POST",
      path: "/alerts/notifications/acknowledge",
    }),
  },

  /** F4 — Admin settings and utilities. No roles exist in this build. */
  settings: {
    list: def({ method: "GET", path: "/settings" }),
    getAlertThreshold: def({ method: "GET", path: "/settings/alert-threshold" }),
    /** Applies globally and takes effect at read time, immediately. */
    updateAlertThreshold: def({ method: "PUT", path: "/settings/alert-threshold" }),
    /** F5 detector control panel (US62) — ~30 governed parameters with two
     *  cross-field constraints, so it does NOT live in `cis_settings`. */
    getDetector: def({ method: "GET", path: "/settings/detector" }),
    /** Every field optional: an omitted parameter keeps its stored value. */
    updateDetector: def({ method: "PUT", path: "/settings/detector" }),
    /** PRD 10.11's bounds — serve the form from this, never hardcode them. */
    detectorRanges: def({ method: "GET", path: "/settings/detector/ranges" }),
    detectorHistory: def({ method: "GET", path: "/settings/detector/history" }),
    /** The same change log across every setting, not just the detector. */
    history: def({ method: "GET", path: "/settings/history" }),
    /** US65 — the closed catalog of Indonesian cities, plus the selection. */
    cities: def({ method: "GET", path: "/settings/cities" }),
    getCity: def({ method: "GET", path: "/settings/city" }),
    /** Single-select: the new city replaces the old outright, and writes
     *  `city_timezone` with it, so F5 report footers follow F6's scope. 422
     *  for a city outside the catalog. Re-fetch `GET /overview` after a save. */
    setCity: def({ method: "PUT", path: "/settings/city" }),
    /** IANA zone name — PRD 10.8 needs city-local time in report footers.
     *  Since v1.5 `PUT /settings/city` normally sets this; writing it directly
     *  is the escape hatch for a city outside the US65 catalog. */
    getCityTimezone: def({ method: "GET", path: "/settings/city-timezone" }),
    setCityTimezone: def({ method: "PUT", path: "/settings/city-timezone" }),
  },

  admin: {
    /** Proxies to the AI service — this backend never writes `claims`. */
    generateGenericClaim: def({
      method: "POST",
      path: "/admin/generate-generic-claim",
    }),
    /** Forces an F3 chart-history snapshot without waiting for the cron job. */
    snapshotScores: def({ method: "POST", path: "/admin/snapshot-scores" }),
    /** Re-evaluates every Existing claim's score. NPR drifts with wall-clock
     *  time, so without this the F3 trend is a horizontal line by construction.
     *  Long call; 503 without an AI service. */
    rescore: def({ method: "POST", path: "/admin/rescore" }),
    /** Until a live crawler exists this is the only way content enters the
     *  system through the product. Long call when `auto_cluster` is on. */
    generateSampleContent: def({
      method: "POST",
      path: "/admin/generate-sample-content",
    }),
    /** Normally unnecessary — ingestion triggers clustering on its own. */
    clusterNow: def({ method: "POST", path: "/admin/cluster-now" }),
    /** Clears backend rows orphaned by an AI-side reseed. Not reversible;
     *  prefer `dry_run` first. 409 trips the empty-database guard. */
    reconcile: def({ method: "POST", path: "/admin/reconcile" }),

    /* --- F5 governance surfaces (US62, US63, US64, PRD 10.9.3) --- */

    /** On-demand run: `{ claim_ids }`. 422 for a Synthetic claim — a predicted
     *  claim has no real posts, so there is nothing to cluster. */
    triggerDetection: def({ method: "POST", path: "/admin/detection-runs" }),
    /** Coordinated clusters that failed the claim-relevance gate. Retained so
     *  an admin can see whether the gate is too loose — never surfaced in F5. */
    offtopicClusters: def({ method: "GET", path: "/admin/offtopic-clusters" }),
    offtopicRates: def({ method: "GET", path: "/admin/offtopic-clusters/rates" }),
    dismissals: def({ method: "GET", path: "/admin/dismissals" }),
    dismissalSummary: def({ method: "GET", path: "/admin/dismissals/summary" }),
    exportAudit: def({ method: "GET", path: "/admin/export-audit" }),

    /* --- the declared-coordination allowlist (US56, US63) --- */

    allowlist: def({ method: "GET", path: "/admin/allowlist" }),
    allowlistCategories: def({ method: "GET", path: "/admin/allowlist/categories" }),
    createAllowlistEntry: def({ method: "POST", path: "/admin/allowlist" }),
    updateAllowlistEntry: def({ method: "PATCH", path: "/admin/allowlist/:id" }),
    /** A removal reason is required and is stored separately from the addition
     *  reason — overwriting the latter would destroy why the entry existed. */
    removeAllowlistEntry: def({ method: "DELETE", path: "/admin/allowlist/:id" }),

    /** Slogans and civic boilerplate excluded from duplication scoring, so a
     *  shared campaign hashtag is not read as content duplication. */
    commonPhrases: def({ method: "GET", path: "/admin/common-phrases" }),
    createCommonPhrase: def({ method: "POST", path: "/admin/common-phrases" }),
    deleteCommonPhrase: def({ method: "DELETE", path: "/admin/common-phrases/:id" }),
  },

  /**
   * F5 — Coordinated-Network Detector.
   *
   * When the detection pipeline has not been deployed its tables are absent and
   * every route here answers `503 SERVICE_UNAVAILABLE` with a display-ready
   * message. F1–F4 are unaffected, and so is the US61 claim badge, which
   * simply does not appear.
   */
  networks: {
    list: def({ method: "GET", path: "/networks" }),
    /** The composite is never returned without `why_flagged` (US50). */
    get: def({ method: "GET", path: "/networks/:id" }),
    /** `reason` is required, min 20 chars — unlike F1's optional claim notes. */
    updateStatus: def({ method: "PUT", path: "/networks/:id/status" }),
    /** Append-only, newest first; each entry carries the signal profile as it
     *  stood at that decision — a re-run recomputes the live scores. */
    reviewLog: def({ method: "GET", path: "/networks/:id/review-log" }),
    /** Nodes carry precomputed ForceAtlas2 coordinates: layout is NOT
     *  recomputed client-side, so the PDF and the screen render identically. */
    graph: def({ method: "GET", path: "/networks/:id/graph" }),
    timeline: def({ method: "GET", path: "/networks/:id/timeline" }),
    /** Rendered from the snapshot and never re-fetched, which is why a deleted
     *  post still appears, marked no longer publicly available. */
    content: def({ method: "GET", path: "/networks/:id/content" }),
    accounts: def({ method: "GET", path: "/networks/:id/accounts" }),
    /** "No account may appear in a network without a viewable reason" (US55). */
    account: def({ method: "GET", path: "/networks/:id/accounts/:accountId" }),
    /** Written to the export audit log BEFORE the bytes are sent. */
    accountsCsv: def({ method: "GET", path: "/networks/:id/accounts.csv" }),
    /** Fail-closed gate: only `under_review` / `confirmed` / `action_taken`. */
    generateReport: def({ method: "POST", path: "/networks/:id/reports" }),
    reports: def({ method: "GET", path: "/networks/:id/reports" }),
    evidenceBundle: def({ method: "POST", path: "/networks/:id/evidence-bundle" }),
    /** US56 — allowlist a whole membership, or one member. */
    allowlistNetwork: def({ method: "POST", path: "/networks/:id/allowlist" }),
    allowlistAccount: def({
      method: "POST",
      path: "/networks/:id/accounts/:accountId/allowlist",
    }),
  },

  /** Addressed by report id: a report outlives the page it came from. */
  reports: {
    /** Carries `X-Content-SHA256` so a recipient can verify the download. */
    file: def({ method: "GET", path: "/reports/:reportId/file" }),
  },

  /**
   * Detection runs. The read side is deliberately NOT under `/admin`:
   * truncation and unavailable signal families explain why a network is banded
   * where it is, which is an analyst's question, not an operator's.
   */
  detectionRuns: {
    list: def({ method: "GET", path: "/detection-runs" }),
    get: def({ method: "GET", path: "/detection-runs/:id" }),
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
