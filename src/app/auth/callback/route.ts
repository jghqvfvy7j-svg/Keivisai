import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google (and any other OAuth provider) sends the user back to.
 *
 * Supabase appends a one-time `code` to this URL. We exchange it for a real
 * session here, on the server, then send the user on. New accounts have no
 * profile yet, so the app layout will route them into onboarding; we do not
 * decide that here, to keep a single source of truth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") ?? "/home";

  // An OAuth provider can also bounce back with an error (user cancelled, etc.).
  const error = searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
