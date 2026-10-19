"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError, safeNext } from "./auth-card";

export function SignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    if (password !== String(form.get("confirm"))) {
      setError("The two passwords don't match.");
      return;
    }

    setPending(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Try again.");
      setPending(false);
      return;
    }

    // The account is created already verified, so sign straight in.
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
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
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
        <span className="text-xs text-muted">At least 8 characters</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="hand text-lg">Type it again</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field" />
      </label>
      <FormError message={error} />
      <button type="submit" disabled={pending} className="btn btn-primary mt-1 w-full">
        {pending ? "Creating your account…" : "Sign up 🎮"}
      </button>
    </form>
  );
}
