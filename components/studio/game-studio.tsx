"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { GamePlayer } from "@/components/games/game-player";
import { shareUrl, type GameRow } from "@/lib/games/db";
import type { GameSpec } from "@/lib/games/spec";
import { createClient } from "@/lib/supabase/client";

type Message = { role: "user" | "assistant"; content: string; pending?: boolean };

const SUGGESTIONS: Record<GameSpec["type"], string[]> = {
  quiz: ["Make it harder", "Add 5 more questions", "Change the theme", "More lives"],
  race: ["Make it faster", "Add another racer", "Change the theme", "More lives"],
  catch: ["Make it slower", "Change the theme", "Add bonus stars", "More lives"],
  memory: ["Add more pairs", "Use animal emojis", "Change the theme", "Add a timer"],
};

export function GameStudio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<GameRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [versions, setVersions] = useState<GameSpec[]>([]);
  const [current, setCurrent] = useState(0);
  const [savedSpec, setSavedSpec] = useState<GameSpec | null>(null);
  const [mode, setMode] = useState<"play" | "chat">("play");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Your game is ready! What should I change?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: auth }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("games").select("*").eq("id", id).maybeSingle<GameRow>(),
      ]);
      if (error || !data) return setNotFound(true);
      if (data.user_id !== auth.user?.id) return router.replace(`/play/${id}`);
      setGame(data);
      setVersions([data.spec]);
      setSavedSpec(data.spec);
    })();
  }, [id, router]);

  const spec = versions[current];
  const dirty = spec !== undefined && spec !== savedSpec;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  }

  async function send(text: string) {
    const instruction = text.trim();
    if (!instruction || busy || !spec) return;
    setInput("");
    setBusy(true);
    const history = messages.filter((m) => !m.pending).slice(1);
    setMessages((m) => [...m, { role: "user", content: instruction }, { role: "assistant", content: "Working on it…", pending: true }]);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, instruction, history }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.spec) throw new Error(data?.error ?? "I couldn't make that change.");
      setVersions((v) => [...v.slice(0, current + 1), data.spec]);
      setCurrent((c) => c + 1);
      setBanner(`Updated: ${instruction}`);
      setMessages((m) => [...m.filter((x) => !x.pending), { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m.filter((x) => !x.pending),
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!game || !spec) return;
    setSaving(true);
    const { error } = await createClient().from("games").update({ spec, title: spec.title }).eq("id", game.id);
    setSaving(false);
    if (error) return flash("Couldn't save. Try again!");
    setSavedSpec(spec);
    flash("Saved to My Games ✓");
  }

  async function copyLink() {
    if (!game) return;
    await navigator.clipboard.writeText(shareUrl(game.id));
    flash("Link copied! 🔗");
  }

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="hand text-3xl">We couldn&apos;t find that game.</p>
        <Link href="/my-games" className="btn btn-primary">
          Go to My games
        </Link>
      </div>
    );
  }

  if (!game || !spec) {
    return <p className="hand p-10 text-center text-2xl text-muted">Loading your game…</p>;
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-3">
        <GamePlayer spec={spec} banner={banner} />
        {mode === "chat" && (
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn !py-1 !text-base" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
              ↶ Undo
            </button>
            <button
              className="btn !py-1 !text-base"
              disabled={current >= versions.length - 1}
              onClick={() => setCurrent(current + 1)}
            >
              ↷ Redo
            </button>
            <span className="text-sm text-muted">Version {current + 1}</span>
            <button className="btn btn-primary ml-auto !py-1.5" disabled={!dirty || saving} onClick={save}>
              💾 {saving ? "Saving…" : dirty ? "Save to My Games" : "Saved"}
            </button>
          </div>
        )}
      </div>

      {mode === "play" ? (
        <aside className="flex flex-col gap-3 lg:pt-12">
          <div className="sketch !bg-sun p-4">
            <h2 className="hand text-2xl">{spec.title}</h2>
            <p className="hand mt-2 text-lg">How to play</p>
            <ul className="mt-1 space-y-1 text-sm">
              {spec.howToPlay.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
          <button className="btn btn-primary w-full" onClick={() => setMode("chat")}>
            ✏️ Edit with chat
          </button>
          <button className="btn w-full" onClick={save} disabled={!dirty || saving}>
            💾 {saving ? "Saving…" : dirty ? "Save game" : "Saved"}
          </button>
          <button className="btn w-full" onClick={copyLink}>
            🔗 Share
          </button>
          <Link href="/my-games" className="hand text-center text-muted hover:text-brand">
            My games →
          </Link>
        </aside>
      ) : (
        <aside className="sketch flex max-h-[80vh] flex-col overflow-hidden lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b-2 border-line px-4 py-3">
            <h2 className="hand text-2xl">Chat with Genie 🧞</h2>
            <button className="text-sm text-muted hover:text-brand" onClick={() => setMode("play")}>
              Close ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl border-2 px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto border-brand bg-brand-soft"
                    : `border-line bg-white ${m.pending ? "animate-pulse text-muted" : ""}`
                }`}
              >
                {m.content}
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div className="border-t-2 border-line p-3">
            <p className="mb-2 text-xs text-muted">Try saying:</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {SUGGESTIONS[spec.type].map((s) => (
                <button
                  key={s}
                  className="hand rounded-lg border-2 border-line bg-sun px-2 py-1 text-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a change…"
                maxLength={500}
                className="field !py-2"
                aria-label="Describe a change"
                disabled={busy}
              />
              <button type="submit" className="btn btn-primary !px-3" disabled={busy || !input.trim()} aria-label="Send">
                ➤
              </button>
            </form>
          </div>
        </aside>
      )}

      {toast && (
        <div className="pop-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border-2 border-line bg-ink px-4 py-2 text-white shadow-[3px_3px_0_var(--brand)]">
          {toast}
        </div>
      )}
    </div>
  );
}
