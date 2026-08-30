import type { ApiMode } from "@/types/common";

/** Runtime configuration derived from public env vars. */
export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Climate Immune System",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  apiMode: (process.env.NEXT_PUBLIC_API_MODE ?? "mock") as ApiMode,
} as const;

export const isMockMode = config.apiMode === "mock";

/** Cookie name holding the auth token — read by middleware and the api client. */
export const AUTH_COOKIE = "cis_token";
