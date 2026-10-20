"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError, safeNext } from "./auth-card";
import { confirmUrl, ResendEmailButton } from "./resend-email";

export function SignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));

    if (password !== String(form.get("confirm"))) {
      setError("The two passwords don't match.");
      return;
    }

    setPending(true);
    setError(null);

    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: confirmUrl(next) },
    });
    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    // With "Confirm email" on, Supabase hides existing accounts by returning
    // a user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in.");
      setPending(false);
      return;
    }

    // "Confirm email" is off in Supabase, so we're signed in already.
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }

    setSentTo(email);
    setPending(false);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="text-5xl" aria-hidden>
          📬
        </div>
        <h2 className="hand text-2xl">Check your email</h2>
        <p className="text-muted">
          We sent a link to <strong className="text-ink">{sentTo}</strong>. Click it to verify your email and start
          making games.
        </p>
        <p className="text-sm text-muted">Can&apos;t find it? Check your spam folder.</p>
        <ResendEmailButton email={sentTo} next={next} />
        <button type="button" onClick={() => setSentTo(null)} className="text-sm text-muted underline-offset-4 hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Your name</span>
        <input name="name" required maxLength={40} autoComplete="nickname" className="field" placeholder="Alex" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Email</span>
        <input name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Password</span>
        <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="field" />
        <span className="text-xs text-muted">At least 8 characters</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Type it again</span>
        <input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="field" />
      </label>
      <FormError message={error} />
      <button type="submit" disabled={pending} className="btn btn-primary mt-1 w-full">
        {pending ? "Creating your account…" : "Sign up 🎮"}
      </button>
    </form>
  );
}
