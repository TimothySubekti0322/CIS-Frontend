import Cookies from "js-cookie";
import { AUTH_COOKIE } from "@/lib/config";

/**
 * Auth token stored in a cookie so `middleware.ts` can gate routes on the edge.
 * Really simple: no refresh, no expiry handling beyond the cookie's own lifetime.
 */
export function getToken(): string | undefined {
  return Cookies.get(AUTH_COOKIE);
}

export function setToken(token: string): void {
  Cookies.set(AUTH_COOKIE, token, {
    expires: 7,
    sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  });
}

export function clearToken(): void {
  Cookies.remove(AUTH_COOKIE);
}
