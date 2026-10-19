"use client";

import { useEffect, useState } from "react";
import type { MemorySpec } from "@/lib/games/spec";
import { PALETTES } from "@/lib/games/themes";
import type { EngineProps } from "./types";
import { useLevelTimer } from "./use-level-timer";

type Card = { id: number; pair: number; face: string };

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealLevel(spec: MemorySpec, level: number, perLevel: number): Card[] {
  const pairs = spec.pairs.slice((level - 1) * perLevel, level * perLevel);
  return shuffle(
    pairs.flatMap((p, i) => [
      { id: i * 2, pair: i, face: p.a },
      { id: i * 2 + 1, pair: i, face: p.b },
    ]),
  );
}

const isEmojiOnly = (s: string) => /^\p{Extended_Pictographic}/u.test(s) && s.length <= 8;

export function MemoryGame({ spec, paused, onHud, sfx }: EngineProps<MemorySpec>) {
  const palette = PALETTES[spec.theme];
  const perLevel = Math.max(2, Math.ceil(spec.pairs.length / spec.levels));
  const levelCount = Math.min(spec.levels, Math.ceil(spec.pairs.length / perLevel));

  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState(() => dealLevel(spec, 1, perLevel));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Memory games don't take lives; mismatches only cost moves.
    onHud({ score: 0, lives: 0, level: 1, timeLeft: spec.timerSeconds || null, status: "playing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onHud({ extra: `${moves} moves` });
  }, [moves, onHud]);

  useLevelTimer(
    spec.timerSeconds,
    !paused && !done,
    level,
    (left) => onHud({ timeLeft: left }),
    () => {
      setDone(true);
      sfx("lose");
      onHud({ status: "lost", message: "Time's up!" });
    },
  );

  function flip(card: Card) {
    if (paused || done || open.length === 2 || open.includes(card.id) || matched.has(card.pair)) return;
    sfx("click");
    const nowOpen = [...open, card.id];
    setOpen(nowOpen);
    if (nowOpen.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = nowOpen.map((id) => cards.find((c) => c.id === id)!);
    if (a.pair === b.pair) {
      const nextMatched = new Set(matched).add(a.pair);
      const nextStreak = streak + 1;
      const points = 50 + (spec.bonus && nextStreak >= 2 ? 25 : 0);
      const nextScore = score + points;
      setMatched(nextMatched);
      setStreak(nextStreak);
      setScore(nextScore);
      setOpen([]);
      sfx("good");
      onHud({ score: nextScore });
      if (nextMatched.size === cards.length / 2) levelCleared(nextScore);
    } else {
      setStreak(0);
      setTimeout(() => setOpen([]), 900);
    }
  }

  function levelCleared(currentScore: number) {
    if (level >= levelCount) {
      setDone(true);
      sfx("win");
      onHud({ status: "won", message: `All pairs found! Score ${currentScore}` });
      return;
    }
    sfx("level");
    onHud({ level: level + 1, timeLeft: spec.timerSeconds || null, status: "levelup", message: `Level ${level + 1}!` });
    setTimeout(() => {
      setLevel(level + 1);
      setCards(dealLevel(spec, level + 1, perLevel));
      setMatched(new Set());
      setOpen([]);
      onHud({ status: "playing", message: undefined });
    }, 1100);
  }

  const cols = cards.length <= 8 ? 4 : cards.length <= 12 ? 4 : cards.length <= 16 ? 4 : 5;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-3 sm:p-6" style={{ background: palette.sky }}>
      <div className="grid w-full max-w-2xl gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cards.map((card) => {
          const faceUp = open.includes(card.id) || matched.has(card.pair);
          return (
            <button
              key={`${level}-${card.id}`}
              onClick={() => flip(card)}
              aria-label={faceUp ? card.face : "Hidden card"}
              className="sketch-flat grid aspect-[4/3] place-items-center p-1 text-center transition-all duration-200"
              style={{
                background: matched.has(card.pair) ? "#bbf7d0" : faceUp ? "#fff" : "var(--brand)",
                boxShadow: "2px 2px 0 var(--line)",
                transform: faceUp ? "rotateY(0)" : "rotateY(180deg)",
              }}
            >
              {faceUp ? (
                <span className={isEmojiOnly(card.face) ? "text-3xl sm:text-4xl" : "text-xs font-semibold leading-tight text-ink sm:text-sm"}>
                  {card.face}
                </span>
              ) : (
                <span className="text-2xl text-white" style={{ transform: "rotateY(180deg)" }}>
                  ?
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
