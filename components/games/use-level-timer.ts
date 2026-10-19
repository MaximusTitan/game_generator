"use client";

import { useEffect, useRef } from "react";

/** Counts down `seconds` once per second while active; resets when `levelKey` changes. */
export function useLevelTimer(
  seconds: number,
  active: boolean,
  levelKey: number,
  onTick: (left: number) => void,
  onTimeout: () => void,
) {
  const left = useRef(seconds);
  const cb = useRef({ onTick, onTimeout });
  useEffect(() => {
    cb.current = { onTick, onTimeout };
  });

  useEffect(() => {
    left.current = seconds;
  }, [seconds, levelKey]);

  useEffect(() => {
    if (!seconds || !active) return;
    const id = setInterval(() => {
      left.current -= 1;
      cb.current.onTick(left.current);
      if (left.current <= 0) {
        clearInterval(id);
        cb.current.onTimeout();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, active, levelKey]);
}
