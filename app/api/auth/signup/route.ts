import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const body = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(40),
  email: z.email("That email doesn't look right"),
  password: z.string().min(8, "Password needs at least 8 characters").max(72),
});

/**
 * Creates the account with the email already confirmed, so new users can
 * play right away without a verification email. The browser signs in with
 * the same credentials afterwards.
 */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    const taken = error.status === 422 || /already/i.test(error.message);
    return NextResponse.json(
      { error: taken ? "An account with this email already exists. Try logging in." : error.message },
      { status: taken ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
