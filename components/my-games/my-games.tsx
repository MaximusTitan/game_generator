"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { remixGame, shareUrl, type GameRow } from "@/lib/games/db";
import { GAME_TYPE_INFO } from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import { createClient } from "@/lib/supabase/client";

export function MyGames() {
  const router = useRouter();
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login?next=/my-games");
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false })
        .returns<GameRow[]>();
      setGames(data ?? []);
      setSelected(data?.[0]?.id ?? null);
    })();
  }, [router]);

  const active = games?.find((g) => g.id === selected) ?? null;

  async function remix(game: GameRow) {
    const id = await remixGame(createClient(), game);
    router.push(`/games/${id}`);
  }

  async function remove(game: GameRow) {
    if (!confirm(`Delete “${game.title}”? This can't be undone.`)) return;
    const { error } = await createClient().from("games").delete().eq("id", game.id);
    if (error) return alert("Couldn't delete that game.");
    setGames((list) => list?.filter((g) => g.id !== game.id) ?? null);
    if (selected === game.id) setSelected(null);
  }

  async function togglePublic(game: GameRow) {
    const is_public = !game.is_public;
    const { error } = await createClient().from("games").update({ is_public }).eq("id", game.id);
    if (!error) setGames((list) => list?.map((g) => (g.id === game.id ? { ...g, is_public } : g)) ?? null);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="hand text-4xl">My games</h1>
        <Link href="/" className="btn btn-primary">
          + New game
        </Link>
      </div>

      {games === null ? (
        <p className="hand text-2xl text-muted">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {games.map((game) => {
              const palette = PALETTES[game.spec.theme] ?? PALETTES.space;
              const isActive = game.id === selected;
              return (
                <div
                  key={game.id}
                  className={`flex flex-col gap-2 rounded-2xl border-2 p-2.5 transition-colors ${
                    isActive ? "border-brand bg-brand-soft shadow-[3px_3px_0_var(--brand)]" : "border-line bg-card shadow-[3px_3px_0_var(--line)]"
                  }`}
                >
                  <button
                    onClick={() => setSelected(game.id)}
                    className="grid aspect-[4/3] place-items-center rounded-xl border-2 border-line text-5xl"
                    style={{ background: palette.sky }}
                    aria-label={`Select ${game.title}`}
                  >
                    {game.spec.hero}
                  </button>
                  <div className="min-w-0 px-0.5">
                    <p className="hand truncate text-xl leading-tight">{game.title}</p>
                    <p className="text-xs text-muted">
                      {GAME_TYPE_INFO[game.type].label} {game.spec.subject && `· 🎓 ${game.spec.subject}`}{" "}
                      {!game.is_public && "· 🔒 private"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href={`/games/${game.id}`} className="btn !px-2 !py-0.5 !text-sm">
                      ▶ Play
                    </Link>
                    <button onClick={() => remix(game)} className="btn !px-2 !py-0.5 !text-sm">
                      🔀 Remix
                    </button>
                  </div>
                </div>
              );
            })}
            <Link
              href="/"
              className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-muted/60 p-4 text-center text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <span>
                <span className="block text-4xl">+</span>
                <span className="hand text-lg">Make a new game</span>
              </span>
            </Link>
          </div>

          {active ? (
            <SharePanel game={active} onRemix={() => remix(active)} onDelete={() => remove(active)} onTogglePublic={() => togglePublic(active)} />
          ) : (
            <div className="sketch hidden p-5 text-center text-muted lg:block">
              {games.length ? "Pick a game to share it." : "Your games will show up here. Make your first one!"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SharePanel({
  game,
  onRemix,
  onDelete,
  onTogglePublic,
}: {
  game: GameRow;
  onRemix: () => void;
  onDelete: () => void;
  onTogglePublic: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = shareUrl(game.id);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#1f1d2b", light: "#ffffff" } }).then(setQr);
  }, [url]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function shareNative() {
    if (navigator.share) {
      await navigator.share({ title: game.title, text: `Play my game “${game.title}”!`, url }).catch(() => {});
    } else {
      await copy();
    }
  }

  return (
    <aside className="sketch flex flex-col gap-3 p-4 lg:sticky lg:top-6 lg:self-start">
      <h2 className="hand text-2xl">
        Share <span aria-hidden>{game.spec.hero}</span> {game.title}
      </h2>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="field !py-1.5 text-xs" aria-label="Share link" />
      <button onClick={copy} className="btn btn-primary w-full" disabled={!game.is_public}>
        {copied ? "✓ Copied!" : "📋 Copy link"}
      </button>
      <button onClick={shareNative} className="btn w-full" disabled={!game.is_public}>
        🏫 Share with my class
      </button>
      {game.is_public ? (
        <div className="flex flex-col items-center gap-1 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR is a data URL */}
          {qr && <img src={qr} alt={`QR code for ${game.title}`} width={160} height={160} className="rounded-lg border-2 border-line" />}
          <p className="text-xs text-muted">Scan to play on a tablet</p>
        </div>
      ) : (
        <p className="rounded-lg bg-brand-soft p-3 text-sm">This game is private, so only you can play it.</p>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={game.is_public} onChange={onTogglePublic} className="h-4 w-4 accent-[var(--brand)]" />
        Anyone with the link can play
      </label>
      <button onClick={onRemix} className="btn w-full">
        🔀 Remix this game
      </button>
      <button onClick={onDelete} className="text-sm text-red-600 hover:underline">
        Delete game
      </button>
    </aside>
  );
}
