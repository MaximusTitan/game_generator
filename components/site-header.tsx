"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SiteHeader() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isSupabaseConfigured) return setUser(null);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email?.split("@")[0];

  return (
    <header className="border-b-2 border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="hand text-2xl text-brand flex items-center gap-2">
          <span aria-hidden>🎮</span> Game Gen
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          {user ? (
            <>
              <Link href="/my-games" className="hand text-lg hover:text-brand">
                My games
              </Link>
              <span className="hidden sm:inline text-muted truncate max-w-40" title={user.email}>
                Hi, {name}!
              </span>
              <button onClick={signOut} className="btn !py-1 !px-3 !text-base">
                Log out
              </button>
            </>
          ) : user === null ? (
            <>
              <Link href="/login" className="hand text-lg hover:text-brand">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary !py-1 !px-3 !text-base">
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
