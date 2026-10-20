"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError, safeNext } from "./auth-card";
import { ResendEmailButton } from "./resend-email";

const LINK_ERROR = "That verification link is invalid or has expired. Log in to get a new one.";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(params.get("error") === "verify" ? LINK_ERROR : null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    setPending(true);
    setError(null);
    setUnverified(null);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password: String(form.get("password")),
    });
    if (error) {
      if (error.code === "email_not_confirmed") {
        setError("Please verify your email first. Click the link we sent you.");
        setUnverified(email);
      } else {
        setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      }
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Email</span>
        <input name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      <FormError message={error} />
      {unverified && <ResendEmailButton email={unverified} next={next} />}
      <button type="submit" disabled={pending} className="btn btn-primary mt-1 w-full">
        {pending ? "Logging in…" : "Log in ✨"}
      </button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href={next !== "/" ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-semibold text-brand"
        >
          Make an account
        </Link>
      </p>
    </form>
  );
}
