import { NextResponse, type NextRequest } from "next/server";
import { HOME_HREF } from "@/lib/constants/routes";

const AUTH_COOKIE = "cis_token";
const AUTH_PAGES = ["/login", "/register"];

/**
 * Really simple route gate: presence of the token cookie only.
 * - unauthenticated + protected route  -> /login
 * - authenticated + auth page           -> the Overview (US66)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = Boolean(req.cookies.get(AUTH_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (!hasToken && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (hasToken && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = HOME_HREF;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
