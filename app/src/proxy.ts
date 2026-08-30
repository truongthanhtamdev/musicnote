import { NextRequest, NextResponse } from "next/server";

// Proxy runs on the Edge runtime, where the jsonwebtoken/Node crypto based
// verifySession() is unavailable. It only does a cheap presence check
// here; full signature verification + role checks happen in the (Node
// runtime) server layouts via requireSession()/requireRole().
const COOKIE_NAME = "musicnote_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student");
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
