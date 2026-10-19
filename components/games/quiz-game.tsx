"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuizSpec } from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import type { EngineProps } from "./types";
import { useLevelTimer } from "./use-level-timer";

const CHOICE_COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8"];
const LETTERS = ["A", "B", "C", "D"];

export function QuizGame({ spec, paused, onHud, sfx }: EngineProps<QuizSpec>) {
  const palette = PALETTES[spec.theme];
  const perLevel = Math.max(1, Math.ceil(spec.questions.length / spec.levels));
  const levelCount = Math.min(spec.levels, Math.ceil(spec.questions.length / perLevel));

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(spec.lives);
  const [streak, setStreak] = useState(0);
  const [bonusFlash, setBonusFlash] = useState(false);
  const [done, setDone] = useState(false);

  const q = spec.questions[index];
  const level = Math.floor(index / perLevel) + 1;
  const isLastInLevel = (index + 1) % perLevel === 0 || index === spec.questions.length - 1;

  useEffect(() => {
    onHud({ score: 0, lives: spec.lives, level: 1, timeLeft: spec.timerSeconds || null, status: "playing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLevelTimer(
    spec.timerSeconds,
    !paused && !done,
    level,
    (left) => onHud({ timeLeft: left }),
    () => end("lost", "Time's up!"),
  );

  const progress = useMemo(
    () => `Question ${(index % perLevel) + 1} of ${Math.min(perLevel, spec.questions.length - (level - 1) * perLevel)}`,
    [index, perLevel, level, spec.questions.length],
  );

  useEffect(() => {
    onHud({ extra: progress });
  }, [progress, onHud]);

  function end(status: "won" | "lost", message: string) {
    setDone(true);
    sfx(status === "won" ? "win" : "lose");
    onHud({ status, message });
  }

  function choose(i: number) {
    if (picked !== null || paused || done) return;
    setPicked(i);
    if (i === q.answer) {
      const nextStreak = streak + 1;
      const bonus = spec.bonus && nextStreak % 3 === 0 ? 50 : 0;
      const nextScore = score + 100 + bonus;
      setStreak(nextStreak);
      setScore(nextScore);
      setBonusFlash(bonus > 0);
      sfx("good");
      onHud({ score: nextScore });
    } else {
      setStreak(0);
      sfx("bad");
      if (spec.lives > 0) {
        const left = lives - 1;
        setLives(left);
        onHud({ lives: left });
      }
    }
  }

  function next() {
    if (spec.lives > 0 && lives <= 0) return end("lost", "Out of lives!");
    if (index + 1 >= spec.questions.length || (isLastInLevel && level >= levelCount)) {
      return end("won", `Quiz complete! You scored ${score}.`);
    }
    if (isLastInLevel) {
      sfx("level");
      onHud({ level: level + 1, timeLeft: spec.timerSeconds || null, status: "levelup", message: `Level ${level + 1}!` });
      setTimeout(() => onHud({ status: "playing", message: undefined }), 1100);
    }
    setIndex(index + 1);
    setPicked(null);
    setBonusFlash(false);
  }

  if (!q) return null;
  const correct = picked !== null && picked === q.answer;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-5 overflow-y-auto p-4 sm:p-8"
      style={{ background: palette.sky, color: palette.ink }}
    >
      <div className="text-5xl" aria-hidden>
        {spec.hero}
      </div>
      <h2 className="hand max-w-2xl text-center text-2xl leading-snug sm:text-3xl">{q.question}</h2>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {q.choices.map((choice, i) => {
          const state =
            picked === null ? "idle" : i === q.answer ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className="sketch-flat flex items-center gap-3 px-4 py-3 text-left text-lg text-ink transition-transform enabled:hover:-translate-y-0.5"
              style={{
                background: state === "right" ? "#86efac" : state === "wrong" ? "#fca5a5" : CHOICE_COLORS[i],
                opacity: state === "dim" ? 0.55 : 1,
                boxShadow: "2px 2px 0 var(--line)",
              }}
            >
              <span className="hand grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-line bg-white">
                {state === "right" ? "✓" : state === "wrong" ? "✗" : LETTERS[i]}
              </span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="pop-in sketch flex w-full max-w-2xl flex-col items-center gap-3 p-4 text-center text-ink sm:flex-row sm:text-left">
          <div className="flex-1">
            <p className="hand text-2xl">
              {correct ? "Correct! 🎉" : "Not quite!"} {bonusFlash && <span className="text-brand">🌟 Streak bonus +50</span>}
            </p>
            <p className="text-sm text-muted">{q.explanation}</p>
          </div>
          <button onClick={next} className="btn btn-primary shrink-0" autoFocus>
            {index + 1 >= spec.questions.length ? "Finish" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
