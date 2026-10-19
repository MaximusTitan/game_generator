"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { GamePlayer } from "@/components/games/game-player";
import { remixGame, type GameRow } from "@/lib/games/db";
import { createClient } from "@/lib/supabase/client";

/** Anyone with the link can play a public game, and signed-in players can remix it. */
export function SharedGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<GameRow | null | undefined>(undefined);
  const [remixing, setRemixing] = useState(false);

  useEffect(() => {
    createClient()
      .from("games")
      .select("*")
      .eq("id", id)
      .maybeSingle<GameRow>()
      .then(({ data }) => setGame(data ?? null));
  }, [id]);

  async function remix() {
    if (!game) return;
    setRemixing(true);
    try {
      const newId = await remixGame(createClient(), game);
      router.push(`/games/${newId}`);
    } catch {
      router.push(`/login?next=${encodeURIComponent(`/play/${id}`)}`);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b-2 border-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="hand flex items-center gap-2 text-2xl text-brand">
            <span aria-hidden>🧞</span> Game Genie
          </Link>
          <Link href="/" className="btn btn-sun !py-1 !text-base">
            ✨ Make your own
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {game === undefined && <p className="hand p-10 text-center text-2xl text-muted">Loading game…</p>}
        {game === null && (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="hand text-3xl">This game isn&apos;t available.</p>
            <p className="text-muted">It may be private or deleted.</p>
            <Link href="/" className="btn btn-primary">
              Make your own game
            </Link>
          </div>
        )}
        {game && (
          <>
            <GamePlayer
              spec={game.spec}
              toolbar={
                <button onClick={remix} disabled={remixing} className="btn btn-primary !px-3 !py-1 !text-base">
                  🔀 {remixing ? "Remixing…" : "Remix"}
                </button>
              }
            />
            <p className="mt-3 text-center text-sm text-muted">
              Made with Game Genie from the idea: <span className="hand text-base text-ink">“{game.prompt}”</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
