// Server only: never import this from a client component.
import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/with-timeout";

export type CurrentUser = {
  user: { id: string; email?: string } | null;
  /** True when we could not reach Supabase (network, timeout), as opposed to
   *  positively knowing there is no session. Callers fail closed on this. */
  failed: boolean;
};

const TIMEOUT = Symbol("timeout");

/**
 * The signed-in user for THIS request.
 *
 * `supabase.auth.getUser()` is a network round trip to Supabase Auth. A single
 * page render used to make six of them (middleware, layout, and each data
 * function separately). React's `cache` memoizes the call for the lifetime of
 * one request, so every caller shares a single round trip.
 *
 * This never throws and never hangs: on a bad network it returns
 * `{ user: null, failed: true }` and the caller decides what to do.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  try {
    const supabase = await createClient();

    type AuthOk = { data: { user: { id: string; email?: string } | null } };
    const result = await withTimeout<AuthOk | typeof TIMEOUT>(
      (supabase.auth.getUser() as unknown as Promise<AuthOk>).catch(() => TIMEOUT as never),
      6000,
      TIMEOUT
    );

    if (result === TIMEOUT) return { user: null, failed: true };
    return { user: result.data.user ?? null, failed: false };
  } catch {
    return { user: null, failed: true };
  }
});
