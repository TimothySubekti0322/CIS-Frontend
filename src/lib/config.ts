import type { ApiMode } from "@/types/common";

/** Runtime configuration derived from public env vars. */
export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Climate Immune System",
  /** Backend origin, e.g. `http://localhost:8080`. No trailing slash needed. */
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, ""),
  /** Version prefix every route sits behind, except the health probes. */
  apiPrefix: process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/v1",
  apiMode: (process.env.NEXT_PUBLIC_API_MODE ?? "mock") as ApiMode,
} as const;

export const isMockMode = config.apiMode === "mock";

/** Access token — read by `middleware.ts` on the edge and by the api client. */
export const AUTH_COOKIE = "cis_token";

/** Refresh token — single-use, exchanged by `POST /auth/refresh`. */
export const REFRESH_COOKIE = "cis_refresh_token";
