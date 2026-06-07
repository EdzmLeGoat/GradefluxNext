import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow internal Next routes, API, static assets, and the login page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname.startsWith("/class-details") ||
    pathname.startsWith("/saml-callback")
  ) {
    return NextResponse.next();
  }

  // Only perform the redirect for top-level navigations that accept HTML.
  // This avoids redirecting data/XHR requests (/_next/data/...) which can
  // cause redirect loops and repeated JSON fetches.
  const accept = req.headers.get("accept") || "";
  const method = req.method || "GET";
  const isHtmlNavigation = method === "GET" && accept.includes("text/html");
  if (!isHtmlNavigation) {
    return NextResponse.next();
  }

  // Check for our lightweight auth cookie
  const authCookie = req.cookies.get("gradefluxAuth");

  if (!authCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|favicon.ico).*)",
};
