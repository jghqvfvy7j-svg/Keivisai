import { withTimeout } from "@/lib/with-timeout";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback", "/terms", "/privacy", "/data-deletion", "/support", "/robots.txt", "/sitemap.xml"];

// Refreshes the Supabase session on every request and gates private routes.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // No Supabase project connected yet — let requests through so the UI
    // can be previewed with mock data. Remove this guard once env vars
    // are set in .env.local.
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Cap the auth check so a slow/hanging network (captive portals, flaky DNS on
  // public wifi) can't block every page load. A sentinel tells us the check
  // TIMED OUT (vs. genuinely no user) so we don't wrongly bounce a logged-in
  // user to /login just because the network was slow. No tokens/secrets logged.
  const TIMEOUT = Symbol("timeout");
  // A hung call is caught by the timeout; a REJECTED call (DNS failure, no route
  // to host, captive portal resetting the connection) is caught here. Either way
  // we end up with the TIMEOUT sentinel and never throw a 500.
  const result = await withTimeout<{ data: { user: unknown } } | typeof TIMEOUT>(
    (supabase.auth.getUser() as unknown as Promise<{ data: { user: unknown } }>).catch(() => TIMEOUT as never),
    4000,
    TIMEOUT
  );

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p) || path.startsWith("/_next");

  // FAIL CLOSED. If we could not positively verify a session — whether because
  // there is no user, or because the network never answered — a private route is
  // never served. We do not assume, guess, or degrade into a demo view. The only
  // thing an unverified visitor can reach is a public page.
  const verifiedUser = result === TIMEOUT ? null : result.data.user;

  if (!verifiedUser && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    // Tell the login screen this was a connectivity problem, not a logout, so it
    // can say so instead of implying the session expired.
    if (result === TIMEOUT) url.searchParams.set("offline", "1");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
