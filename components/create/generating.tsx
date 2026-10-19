"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { icon: "✏️", label: "Designing", at: 0 },
  { icon: "🔨", label: "Building", at: 35 },
  { icon: "🧪", label: "Testing", at: 75 },
];

const TIPS = [
  "Tip: you can change anything later by chatting with me!",
  "Tip: say “make it faster” or “add a level” after you play.",
  "Tip: share your game with a link or a QR code.",
];

/** Progress screen while the AI builds the game. Eases toward 95% until the request finishes. */
export function Generating({ done }: { done: boolean }) {
  const [progress, setProgress] = useState(4);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => (p < 95 ? p + (95 - p) * 0.06 : p)), 300);
    const tipId = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 4000);
    return () => (clearInterval(id), clearInterval(tipId));
  }, []);

  const pct = done ? 100 : Math.round(progress);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="bob text-7xl" aria-hidden>
        🧞
      </div>
      <div>
        <h1 className="hand text-4xl">{done ? "Your game is ready!" : "Building your game…"}</h1>
        <p className="mt-1 text-muted">This only takes a moment</p>
      </div>
      <div className="w-full max-w-lg">
        <div
          className="h-6 overflow-hidden rounded-full border-2 border-line bg-white"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-right text-sm tabular-nums text-muted">{pct}%</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-3">
        {STEPS.map((step, i) => {
          const next = STEPS[i + 1]?.at ?? 101;
          const state = done || pct >= next ? "done" : pct >= step.at ? "active" : "waiting";
          return (
            <div
              key={step.label}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-4 ${
                state === "done"
                  ? "border-line bg-mint shadow-[3px_3px_0_var(--line)]"
                  : state === "active"
                    ? "border-brand bg-brand-soft shadow-[3px_3px_0_var(--brand)]"
                    : "border-dashed border-muted/50 bg-card"
              }`}
            >
              <span className={`text-3xl ${state === "active" ? "animate-bounce" : ""}`} aria-hidden>
                {step.icon}
              </span>
              <span className="hand text-xl">{step.label}</span>
              <span className="text-xs text-muted">
                {state === "done" ? "✓ Done" : state === "active" ? "Working on it…" : "Waiting"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="hand text-lg text-muted" aria-live="polite">
        💡 {TIPS[tip]}
      </p>
    </div>
  );
}
