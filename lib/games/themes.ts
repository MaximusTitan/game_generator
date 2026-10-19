import type { Theme } from "./spec";

export type Palette = {
  label: string;
  icon: string;
  sky: string; // play-area background
  ground: string; // road edges / floor
  track: string; // race road surface
  accent: string;
  ink: string; // text on top of sky
  decor: string[]; // background sprinkles
};

export const PALETTES: Record<Theme, Palette> = {
  space: { label: "Space", icon: "🚀", sky: "#1e1b4b", ground: "#312e81", track: "#3730a3", accent: "#facc15", ink: "#f8fafc", decor: ["✦", "·", "🪐", "✧"] },
  jungle: { label: "Jungle", icon: "🌴", sky: "#bbf7d0", ground: "#15803d", track: "#a16207", accent: "#f59e0b", ink: "#14532d", decor: ["🌿", "🍃", "🌺"] },
  ocean: { label: "Ocean", icon: "🌊", sky: "#bae6fd", ground: "#0369a1", track: "#0ea5e9", accent: "#f97316", ink: "#0c4a6e", decor: ["🫧", "🐚", "〰"] },
  candy: { label: "Candy", icon: "🍭", sky: "#fce7f3", ground: "#db2777", track: "#f9a8d4", accent: "#7c3aed", ink: "#831843", decor: ["🍬", "🍩", "✿"] },
  city: { label: "City", icon: "🏙️", sky: "#e0e7ff", ground: "#475569", track: "#334155", accent: "#eab308", ink: "#1e293b", decor: ["🏢", "☁️"] },
  desert: { label: "Desert", icon: "🏜️", sky: "#fef3c7", ground: "#d97706", track: "#fbbf24", accent: "#b91c1c", ink: "#78350f", decor: ["🌵", "☀️"] },
  snow: { label: "Snow", icon: "❄️", sky: "#f0f9ff", ground: "#94a3b8", track: "#e2e8f0", accent: "#2563eb", ink: "#0f172a", decor: ["❄", "❅", "⛄"] },
};
