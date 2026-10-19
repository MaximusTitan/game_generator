import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";

/** Request-scoped client that acts as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; the proxy refreshes the session.
        }
      },
    },
  });
}

/** Privileged client for admin tasks. Never expose to the browser. */
export function createAdminClient() {
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set");
  }
  return createSupabaseClient(supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
