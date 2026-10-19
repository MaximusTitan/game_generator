import type { GameSpec } from "@/lib/games/spec";

export type GameStatus = "ready" | "playing" | "levelup" | "won" | "lost";

export type Hud = {
  score: number;
  lives: number; // 0 = unlimited / not used
  level: number;
  timeLeft: number | null; // seconds, null = no timer
  status: GameStatus;
  message?: string;
  extra?: string; // small engine-specific readout, e.g. race position
};

export type EngineProps<S extends GameSpec = GameSpec> = {
  spec: S;
  paused: boolean;
  onHud: (hud: Partial<Hud>) => void;
  sfx: (name: SfxName) => void;
  /** Held on-screen arrow buttons for touch play (Phaser engines). */
  controls: React.RefObject<{ left: boolean; right: boolean }>;
};

export type SfxName = "good" | "bad" | "level" | "win" | "lose" | "click";
