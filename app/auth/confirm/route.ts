import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/components/auth/auth-card";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for the link in the verification email. Handles both the
 * `token_hash` link (works in any browser; needs the custom email template
 * from the README) and the default PKCE `code` link (only works in the
 * browser that signed up). Signs the user in and sends them on their way.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (ok) return NextResponse.redirect(new URL(next, request.url));

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "verify");
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}
