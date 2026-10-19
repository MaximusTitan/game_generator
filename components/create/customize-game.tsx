"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  DIFFICULTIES,
  GAME_TYPES,
  GAME_TYPE_INFO,
  THEMES,
  type CustomizeOptions,
  type GameType,
} from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import { Generating } from "./generating";

const HEROES = ["🐱", "🤖", "🐉", "🦊", "🐼", "🦄", "🧙", "🚀"];
const DIFFICULTY_ICON = { easy: "😊", medium: "😎", hard: "🔥" };

export function CustomizeGame() {
  const params = useSearchParams();
  const router = useRouter();
  const prompt = params.get("prompt") ?? "";
  const typeParam = params.get("type");

  const [options, setOptions] = useState<CustomizeOptions>({
    prompt,
    type: GAME_TYPES.includes(typeParam as GameType) ? (typeParam as GameType) : null,
    theme: "surprise",
    difficulty: "medium",
    hero: "",
    lives: true,
    timer: false,
    bonus: true,
    levels: 3,
  });
  const [customHero, setCustomHero] = useState("");
  const [phase, setPhase] = useState<"edit" | "generating">("edit");
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const set = <K extends keyof CustomizeOptions>(key: K, value: CustomizeOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  async function generate() {
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) return router.push(`/login?next=${encodeURIComponent(`/create?${params}`)}`);
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Something went wrong.");
      setDoneId(data.id);
      setTimeout(() => router.push(`/games/${data.id}`), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("edit");
    }
  }

  if (!prompt) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="hand text-2xl">First, tell the genie your game idea!</p>
        <Link href="/" className="btn btn-primary">
          ← Describe a game
        </Link>
      </div>
    );
  }

  if (phase === "generating") return <Generating done={Boolean(doneId)} />;

  const previewTheme = options.theme === "surprise" ? null : PALETTES[options.theme];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="hand text-4xl">Make it yours</h1>
            <p className="mt-1 text-muted">
              Your idea: <span className="hand text-lg text-ink">“{prompt}”</span>
            </p>
          </div>
          <Link href="/" className="hand shrink-0 text-lg text-muted hover:text-brand">
            ‹ Back
          </Link>
        </div>

        <Section title="Game type">
          <Chip pressed={options.type === null} onClick={() => set("type", null)}>
            🪄 Genie picks
          </Chip>
          {GAME_TYPES.map((t) => (
            <Chip key={t} pressed={options.type === t} onClick={() => set("type", t)}>
              {GAME_TYPE_INFO[t].icon} {GAME_TYPE_INFO[t].label}
            </Chip>
          ))}
        </Section>

        <Section title="Theme">
          <Chip pressed={options.theme === "surprise"} onClick={() => set("theme", "surprise")}>
            🎁 Surprise me
          </Chip>
          {THEMES.map((t) => (
            <Chip key={t} pressed={options.theme === t} onClick={() => set("theme", t)}>
              {PALETTES[t].icon} {PALETTES[t].label}
            </Chip>
          ))}
        </Section>

        <Section title="Difficulty">
          {DIFFICULTIES.map((d) => (
            <Chip key={d} pressed={options.difficulty === d} onClick={() => set("difficulty", d)} wide>
              {DIFFICULTY_ICON[d]} <span className="capitalize">{d}</span>
            </Chip>
          ))}
        </Section>

        <Section title="Character">
          <button
            type="button"
            aria-pressed={options.hero === ""}
            onClick={() => set("hero", "")}
            className="chip !rounded-full !px-3 text-sm"
          >
            🪄 Genie picks
          </button>
          {HEROES.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={options.hero === h}
              onClick={() => set("hero", h)}
              aria-label={`Character ${h}`}
              className="chip !h-12 !w-12 !rounded-full !p-0 text-2xl"
            >
              {h}
            </button>
          ))}
          <input
            value={customHero}
            onChange={(e) => {
              const v = [...e.target.value].slice(-2).join("");
              setCustomHero(v);
              if (v.trim()) set("hero", v.trim());
            }}
            placeholder="+"
            aria-label="Type your own emoji"
            title="Type or paste your own emoji"
            className={`h-12 w-12 rounded-full border-2 border-dashed text-center text-2xl outline-none ${
              customHero && options.hero === customHero.trim() ? "border-brand bg-brand-soft" : "border-line bg-card"
            }`}
          />
        </Section>

        <Section title="Rules">
          <Toggle on={options.lives} onClick={() => set("lives", !options.lives)}>3 lives</Toggle>
          <Toggle on={options.timer} onClick={() => set("timer", !options.timer)}>Timer</Toggle>
          <Toggle on={options.bonus} onClick={() => set("bonus", !options.bonus)}>Bonus stars</Toggle>
        </Section>

        <Section title="Number of levels">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn !px-3"
              aria-label="Fewer levels"
              disabled={options.levels <= 1}
              onClick={() => set("levels", options.levels - 1)}
            >
              −
            </button>
            <span className="sketch-flat hand min-w-28 px-4 py-1.5 text-center text-xl tabular-nums">
              {options.levels} level{options.levels > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className="btn !px-3"
              aria-label="More levels"
              disabled={options.levels >= 10}
              onClick={() => set("levels", options.levels + 1)}
            >
              +
            </button>
          </div>
        </Section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="sketch p-4">
          <p className="hand mb-3 text-xl">Your game so far</p>
          <div
            className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border-2 border-line"
            style={{ background: previewTheme?.sky ?? "var(--sky)" }}
          >
            {previewTheme?.decor.map((d, i) => (
              <span key={i} className="absolute text-xl opacity-40" style={{ left: `${15 + i * 27}%`, top: `${12 + (i % 2) * 55}%` }}>
                {d}
              </span>
            ))}
            <span className="bob text-6xl">{options.hero || "❔"}</span>
          </div>
          <ul className="mt-3 space-y-0.5 text-sm text-muted">
            <li>
              {options.type ? `${GAME_TYPE_INFO[options.type].icon} ${GAME_TYPE_INFO[options.type].label}` : "🪄 Genie picks the game type"}
            </li>
            <li>
              {options.theme === "surprise" ? "🎁 Surprise theme" : `${PALETTES[options.theme].icon} ${PALETTES[options.theme].label}`} ·{" "}
              {DIFFICULTY_ICON[options.difficulty]} <span className="capitalize">{options.difficulty}</span>
            </li>
            <li>
              {options.levels} level{options.levels > 1 ? "s" : ""}
              {options.lives && " · 3 lives"}
              {options.timer && " · timer on"}
              {options.bonus && " · bonus stars"}
            </li>
          </ul>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border-2 border-heart bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button onClick={generate} className="btn btn-primary w-full !py-3 !text-2xl">
          Generate game ✨
        </button>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="hand mb-2 text-xl">{title}</h2>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

function Chip({
  pressed,
  onClick,
  children,
  wide,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`chip ${wide ? "min-w-32" : ""}`}>
      {children}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="chip min-w-32">
      <span
        className={`grid h-5 w-5 place-items-center rounded border-2 text-xs ${on ? "border-brand bg-brand text-white" : "border-line bg-white"}`}
        aria-hidden
      >
        {on ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}
