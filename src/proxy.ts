import { NextResponse, type NextRequest } from "next/server";
import { updateSession, PUBLIC_PATHS } from "@/lib/supabase/middleware";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/_next");
}

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Last-resort safety net: the session refresh threw for some unforeseen
    // reason. FAIL CLOSED. A private route is never served on an unverified
    // session, so an outage can never become an open door. Public pages still
    // load, which keeps the site reachable instead of returning a 500.
    // Nothing is logged here, to avoid leaking request or auth details.
    const path = request.nextUrl.pathname;
    if (isPublicPath(path)) return NextResponse.next({ request });

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    url.searchParams.set("offline", "1");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
