// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // allow public assets, API, next internals, root login page
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/" ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // protect these prefixes
  const protectedPrefixes = ["/modules", "/scenario", "/coins", "/admin"];
  const needsAuth = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const session = req.cookies.get("pyp_session")?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/modules/:path*", "/scenario/:path*", "/coins/:path*", "/admin/:path*"]
};
