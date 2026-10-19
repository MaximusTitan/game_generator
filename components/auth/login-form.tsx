"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError, safeNext } from "./auth-card";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
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
