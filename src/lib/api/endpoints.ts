/**
 * API endpoint path templates.
 *
 * These are PLACEHOLDERS. The real backend contract (paths, verbs, params, payload
 * shapes) will be filled in later — update the paths here and the request/response
 * mapping in the matching `src/lib/api/*.ts` module, then set
 * NEXT_PUBLIC_API_MODE=live.
 *
 * `:param` segments are substituted by `buildPath()`.
 */
export const ENDPOINTS = {
  auth: {
    register: { method: "POST", path: "/auth/register" }, // TODO: confirm with backend
    login: { method: "POST", path: "/auth/login" }, // TODO
    me: { method: "GET", path: "/auth/me" }, // TODO
  },
  claims: {
    listGeneric: { method: "GET", path: "/claims/generic" }, // TODO
    listSynthetic: { method: "GET", path: "/claims/synthetic" }, // TODO
    getGeneric: { method: "GET", path: "/claims/generic/:id" }, // TODO
    getSynthetic: { method: "GET", path: "/claims/synthetic/:id" }, // TODO
    updateStatus: { method: "PATCH", path: "/claims/:id/status" }, // TODO
    generateGeneric: { method: "POST", path: "/claims/generic/generate" }, // TODO (F4 / US33)
  },
  policies: {
    list: { method: "GET", path: "/policies" }, // TODO
    get: { method: "GET", path: "/policies/:id" }, // TODO
    create: { method: "POST", path: "/policies" }, // TODO (US40)
    matchmakingStatus: { method: "GET", path: "/policies/:id/matchmaking" }, // TODO (US42)
  },
  alerts: {
    listWatchlist: { method: "GET", path: "/alerts/watchlist" }, // TODO
    addToWatchlist: { method: "POST", path: "/alerts/watchlist" }, // TODO (US14)
    removeFromWatchlist: { method: "DELETE", path: "/alerts/watchlist/:claimId" }, // TODO
  },
  admin: {
    getSettings: { method: "GET", path: "/admin/settings" }, // TODO
    updateSettings: { method: "PUT", path: "/admin/settings" }, // TODO (US32)
  },
} as const;

/** Substitute `:param` segments and append a query string. */
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
        value.forEach((v) => qs.append(key, String(v)));
      } else {
        qs.set(key, String(value));
      }
    }
    const s = qs.toString();
    if (s) result += `?${s}`;
  }
  return result;
}
