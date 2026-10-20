"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { withLearningDefaults, type CatchSpec, type GameSpec, type RaceSpec } from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import { catchScene } from "./catch-scene";
import { MemoryGame } from "./memory-game";
import { PhaserHost } from "./phaser-host";
import { QuizGame } from "./quiz-game";
import { raceScene } from "./race-scene";
import { playSfx } from "./sfx";
import type { EngineProps, Hud, SfxName } from "./types";

const START_HUD: Hud = { score: 0, lives: 0, level: 1, timeLeft: null, status: "ready" };

function Engine(props: EngineProps) {
  const { spec } = props;
  switch (spec.type) {
    case "quiz":
      return <QuizGame {...props} spec={spec} />;
    case "memory":
      return <MemoryGame {...props} spec={spec} />;
    case "catch":
      return <PhaserHost<CatchSpec> {...props} spec={spec} factory={catchScene} />;
    case "race":
      return <PhaserHost<RaceSpec> {...props} spec={spec} factory={raceScene} />;
  }
}

export function GamePlayer({
  spec: rawSpec,
  banner,
  autoStart = false,
  toolbar,
}: {
  spec: GameSpec;
  /** Short note shown over the game, e.g. after an AI edit. */
  banner?: string | null;
  autoStart?: boolean;
  toolbar?: ReactNode;
}) {
  // Games saved before learning fields existed still play.
  const spec = useMemo(() => withLearningDefaults(rawSpec), [rawSpec]);
  const [hud, setHud] = useState<Hud>({ ...START_HUD, lives: spec.lives, status: autoStart ? "playing" : "ready" });
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [muted, setMuted] = useState(!spec.sound);
  const controls = useRef({ left: false, right: false });
  const palette = PALETTES[spec.theme];
  const usesArrows = spec.type === "catch" || spec.type === "race";

  const onHud = useCallback((patch: Partial<Hud>) => setHud((h) => ({ ...h, ...patch })), []);
  const sfx = useCallback((name: SfxName) => !muted && playSfx(name), [muted]);

  // A new spec (AI edit, undo/redo) restarts the game with the new rules.
  const specKey = JSON.stringify(spec);
  const [lastSpecKey, setLastSpecKey] = useState(specKey);
  if (specKey !== lastSpecKey) {
    setLastSpecKey(specKey);
    setRunId((r) => r + 1);
    setPaused(false);
    setHud((h) => ({ ...START_HUD, lives: spec.lives, status: h.status === "ready" ? "ready" : "playing" }));
  }

  function start() {
    playSfx("click");
    setHud({ ...START_HUD, lives: spec.lives, status: "playing" });
    setPaused(false);
    setRunId((r) => r + 1);
  }

  // Space / P toggles pause while playing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "p" || e.key === "P") && hud.status === "playing") setPaused((p) => !p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hud.status]);

  const running = hud.status === "playing" || hud.status === "levelup";
  const ended = hud.status === "won" || hud.status === "lost";

  return (
    <div className="flex w-full flex-col gap-3">
      {/* HUD */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="hand flex items-center gap-1.5 text-2xl tabular-nums">
          <span aria-hidden>⭐</span> {hud.score}
        </span>
        {spec.lives > 0 && spec.type !== "memory" && (
          <span className="flex items-center gap-0.5 text-xl" aria-label={`${hud.lives} lives left`}>
            {Array.from({ length: spec.lives }, (_, i) => (
              <span key={i} className={i < hud.lives ? "" : "opacity-25 grayscale"}>
                ❤️
              </span>
            ))}
          </span>
        )}
        <span className="hand text-xl text-muted">
          Level {hud.level}
          {spec.levels > 1 && <span className="text-base"> / {spec.levels}</span>}
        </span>
        {hud.timeLeft !== null && running && (
          <span className={`hand text-xl tabular-nums ${hud.timeLeft <= 10 ? "text-heart" : ""}`}>⏱ {hud.timeLeft}s</span>
        )}
        {hud.extra && running && <span className="text-sm text-muted">{hud.extra}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="btn !px-2.5 !py-1 !text-base"
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            disabled={hud.status !== "playing"}
            className="btn !px-3 !py-1 !text-base"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button onClick={start} className="btn !px-3 !py-1 !text-base">
            ↻ Restart
          </button>
          {toolbar}
        </div>
      </div>

      {/* Stage */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border-2 border-line ${usesArrows ? "aspect-[8/5]" : "h-[min(70vh,560px)] min-h-[440px]"}`}
        style={{ background: palette.sky, boxShadow: "3px 3px 0 var(--line)" }}
      >
        {hud.status !== "ready" && (
          <Engine key={runId} spec={spec} paused={paused || ended} onHud={onHud} sfx={sfx} controls={controls} />
        )}

        {banner && (
          <div key={banner} className="pop-in absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg border-2 border-line bg-sun px-3 py-1 text-sm font-semibold shadow-[2px_2px_0_var(--line)]">
            ✨ {banner}
          </div>
        )}

        {hud.status === "ready" && (
          <Overlay>
            <div className="bob text-6xl" aria-hidden>
              {spec.hero}
            </div>
            <h2 className="hand text-4xl">{spec.title}</h2>
            {spec.learningGoal && (
              <p className="rounded-lg border-2 border-line bg-sun px-3 py-1 text-sm font-semibold">
                🎓 {spec.learningGoal}
              </p>
            )}
            <ul className="text-sm text-muted">
              {spec.howToPlay.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button onClick={start} className="btn btn-primary !px-8 !text-2xl" autoFocus>
              ▶ Play
            </button>
          </Overlay>
        )}

        {hud.status === "levelup" && hud.message && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <div className="pop-in hand rounded-2xl border-2 border-line bg-sun px-8 py-4 text-4xl shadow-[3px_3px_0_var(--line)]">
              {hud.message}
            </div>
          </div>
        )}

        {paused && running && (
          <Overlay>
            <h2 className="hand text-4xl">Paused</h2>
            <button onClick={() => setPaused(false)} className="btn btn-primary !px-8 !text-2xl" autoFocus>
              ▶ Resume
            </button>
          </Overlay>
        )}

        {ended && (
          <Overlay>
            <div className="text-6xl" aria-hidden>
              {hud.status === "won" ? "🏆" : "💫"}
            </div>
            <h2 className="hand text-4xl">{hud.status === "won" ? "You did it!" : "Game over"}</h2>
            <p className="text-muted">{hud.message}</p>
            <p className="hand text-2xl">⭐ {hud.score} points</p>
            {spec.facts.length > 0 && (
              <div className="w-full rounded-xl border-2 border-line bg-card px-4 py-2 text-left text-sm">
                <p className="hand text-lg">💡 Did you know?</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {spec.facts.slice(0, 3).map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={start} className="btn btn-primary !px-6 !text-xl" autoFocus>
              ↻ Play again
            </button>
          </Overlay>
        )}

        {usesArrows && running && !paused && (
          <div className="absolute bottom-3 left-3 z-10 flex gap-2">
            {(["left", "right"] as const).map((dir) => (
              <button
                key={dir}
                aria-label={`Move ${dir}`}
                className="btn !px-3 !py-1.5 !text-lg opacity-90"
                onPointerDown={(e) => {
                  e.preventDefault();
                  controls.current[dir] = true;
                }}
                onPointerUp={() => (controls.current[dir] = false)}
                onPointerLeave={() => (controls.current[dir] = false)}
                onPointerCancel={() => (controls.current[dir] = false)}
              >
                {dir === "left" ? "◀" : "▶"}
              </button>
            ))}
          </div>
        )}
      </div>
      {usesArrows && (
        <p className="text-xs text-muted">
          Use the arrow keys or the buttons to move{spec.type === "race" ? " (↑ for a little speed)" : ""}. Press P to pause.
        </p>
      )}
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-white/70 p-4 backdrop-blur-[2px]">
      <div className="pop-in flex max-w-md flex-col items-center gap-3 text-center">{children}</div>
    </div>
  );
}
