"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Where the link in the verification email lands; see app/auth/confirm/route.ts. */
export function confirmUrl(next: string) {
  const url = new URL("/auth/confirm", window.location.origin);
  if (next !== "/") url.searchParams.set("next", next);
  return url.toString();
}

export function ResendEmailButton({ email, next }: { email: string; next: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    setError(null);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmUrl(next) },
    });
    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={resend} disabled={state !== "idle"} className="btn w-full">
        {state === "sending" ? "Sending…" : state === "sent" ? "Sent! Check your inbox 📬" : "Resend the email"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
