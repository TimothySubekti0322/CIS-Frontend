import Cookies from "js-cookie";
import { AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/config";

/**
 * Token storage.
 *
 * The access token lives in a cookie so `middleware.ts` can gate routes on the
 * edge. The refresh token sits beside it in its own cookie: it is single-use
 * and rotated on every `POST /auth/refresh`, so a stale copy is harmless, but
 * both are readable by scripts on this origin — a pure client-side app cannot
 * set httpOnly. See the "Auth" section of MISSING_ENDPOINT.MD for the
 * cookie-session alternative worth asking the backend for.
 */

const secure = () =>
  typeof window !== "undefined" && window.location.protocol === "https:";

export function getToken(): string | undefined {
  return Cookies.get(AUTH_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_COOKIE);
}

/**
 * @param expiresIn access-token lifetime in seconds, from the auth response.
 *                  The cookie is given the same lifetime so the middleware
 *                  stops trusting it at roughly the moment the API does.
 */
export function setSession(
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null,
): void {
  const days = expiresIn && expiresIn > 0 ? expiresIn / 86_400 : 1;
  Cookies.set(AUTH_COOKIE, accessToken, {
    expires: days,
    sameSite: "lax",
    secure: secure(),
  });
  if (refreshToken) {
    // Outlives the access token — it is how a session survives expiry.
    Cookies.set(REFRESH_COOKIE, refreshToken, {
      expires: 30,
      sameSite: "lax",
      secure: secure(),
    });
  }
}

export function clearSession(): void {
  Cookies.remove(AUTH_COOKIE);
  Cookies.remove(REFRESH_COOKIE);
}
