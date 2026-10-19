import { z } from "zod";

/**
 * A game is data, not code: the AI fills in one of these specs and the
 * matching engine in components/games renders it. Keeping the AI on a schema
 * means every generated game is playable and safe to run.
 */

export const GAME_TYPES = ["quiz", "race", "catch", "memory"] as const;
export type GameType = (typeof GAME_TYPES)[number];

export const GAME_TYPE_INFO: Record<GameType, { label: string; icon: string; blurb: string }> = {
  quiz: { label: "Quiz", icon: "❓", blurb: "Trivia, study tests and puzzle quizzes" },
  race: { label: "Race", icon: "🏎️", blurb: "Dodge obstacles and beat the other racers" },
  catch: { label: "Catcher", icon: "⭐", blurb: "Catch the good stuff, dodge the bad" },
  memory: { label: "Memory match", icon: "🃏", blurb: "Flip cards and find the pairs" },
};

export const THEMES = ["space", "jungle", "ocean", "candy", "city", "desert", "snow"] as const;
export type Theme = (typeof THEMES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// Numeric ranges live in descriptions (not .min/.max) because provider
// structured-output modes reject some JSON-schema keywords. normalizeSpec()
// clamps everything afterwards.
const base = {
  title: z.string().describe("Short, catchy game title (max 4 words)"),
  theme: z.enum(THEMES),
  difficulty: z.enum(DIFFICULTIES),
  hero: z.string().describe("A single emoji for the player character"),
  heroName: z.string().describe("Fun name for the player character"),
  howToPlay: z.array(z.string()).describe("2-4 very short instructions a 7 year old understands"),
  lives: z.number().int().describe("Lives, 0 means unlimited, otherwise 1-9"),
  timerSeconds: z.number().int().describe("Time limit per level in seconds, 0 means no timer, otherwise 15-180"),
  levels: z.number().int().describe("Number of levels, 1-10"),
  bonus: z.boolean().describe("Whether bonus stars / power-ups appear"),
  sound: z.boolean().describe("Whether to play simple sound effects"),
};

export const quizSpec = z.object({
  type: z.literal("quiz"),
  ...base,
  questions: z
    .array(
      z.object({
        question: z.string(),
        choices: z.array(z.string()).describe("Exactly 4 short answer choices"),
        answer: z.number().int().describe("0-based index of the correct choice"),
        explanation: z.string().describe("One friendly sentence explaining the answer"),
      }),
    )
    .describe("Questions in order. Provide levels x 5 questions, getting harder each level."),
});

export const raceSpec = z.object({
  type: z.literal("race"),
  ...base,
  hero: z.string().describe("A single vehicle or character emoji the player drives, e.g. 🏎️ 🚙 🐆"),
  opponents: z
    .array(z.object({ name: z.string(), emoji: z.string() }))
    .describe("1-5 rival racers"),
  obstacles: z.array(z.string()).describe("2-5 obstacle emojis that fit the theme, e.g. 🪨 🌴 🛢️"),
  pickups: z.array(z.string()).describe("1-3 collectible emojis worth points, e.g. ⭐ 🪙 🍌"),
  speed: z.number().int().describe("Base speed 1-10"),
  obstacleDensity: z.number().int().describe("How many obstacles, 1-10"),
  lanes: z.number().int().describe("Number of lanes, 3-5"),
  trackLength: z.number().int().describe("Length of each level in seconds of driving, 20-90"),
});

export const catchSpec = z.object({
  type: z.literal("catch"),
  ...base,
  goodItems: z.array(z.string()).describe("1-4 emojis to catch"),
  badItems: z.array(z.string()).describe("1-4 emojis to avoid"),
  fallSpeed: z.number().int().describe("Base fall speed 1-10"),
  spawnRate: z.number().int().describe("How often items drop, 1-10"),
  targetScore: z.number().int().describe("Points needed to clear each level, 50-500"),
});

export const memorySpec = z.object({
  type: z.literal("memory"),
  ...base,
  pairs: z
    .array(z.object({ a: z.string(), b: z.string() }))
    .describe(
      "Matching pairs. For a plain picture game use the same emoji for a and b. For learning use term/definition, word/translation, question/answer etc. Keep each side under 24 characters. Provide levels x 6 pairs.",
    ),
});

export const gameSpec = z.discriminatedUnion("type", [quizSpec, raceSpec, catchSpec, memorySpec]);

export type QuizSpec = z.infer<typeof quizSpec>;
export type RaceSpec = z.infer<typeof raceSpec>;
export type CatchSpec = z.infer<typeof catchSpec>;
export type MemorySpec = z.infer<typeof memorySpec>;
export type GameSpec = z.infer<typeof gameSpec>;

export const specSchemaFor = {
  quiz: quizSpec,
  race: raceSpec,
  catch: catchSpec,
  memory: memorySpec,
} as const;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));
const nonEmpty = (list: string[], fallback: string[]) => {
  const cleaned = list.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
};

/** Clamp AI output into ranges the engines can always handle. */
export function normalizeSpec(spec: GameSpec): GameSpec {
  const common = {
    ...spec,
    title: spec.title.trim().slice(0, 40) || "My Game",
    hero: spec.hero.trim() || "🤖",
    howToPlay: nonEmpty(spec.howToPlay, ["Have fun!"]).slice(0, 4),
    lives: spec.lives <= 0 ? 0 : clamp(spec.lives, 1, 9),
    timerSeconds: spec.timerSeconds <= 0 ? 0 : clamp(spec.timerSeconds, 10, 300),
    levels: clamp(spec.levels, 1, 10),
  };

  switch (common.type) {
    case "quiz": {
      const questions = common.questions
        .filter((q) => q.question.trim() && q.choices.length >= 2)
        .map((q) => ({
          ...q,
          choices: q.choices.slice(0, 4),
          answer: clamp(q.answer, 0, Math.min(3, q.choices.length - 1)),
        }));
      return {
        ...common,
        questions: questions.length
          ? questions
          : [{ question: "Ready to play?", choices: ["Yes!", "No"], answer: 0, explanation: "Let's go!" }],
      };
    }
    case "race":
      return {
        ...common,
        opponents: common.opponents.slice(0, 5),
        obstacles: nonEmpty(common.obstacles, ["🪨"]).slice(0, 5),
        pickups: nonEmpty(common.pickups, ["⭐"]).slice(0, 3),
        speed: clamp(common.speed, 1, 10),
        obstacleDensity: clamp(common.obstacleDensity, 1, 10),
        lanes: clamp(common.lanes, 3, 5),
        trackLength: clamp(common.trackLength, 15, 120),
      };
    case "catch":
      return {
        ...common,
        goodItems: nonEmpty(common.goodItems, ["⭐"]).slice(0, 4),
        badItems: nonEmpty(common.badItems, ["☄️"]).slice(0, 4),
        fallSpeed: clamp(common.fallSpeed, 1, 10),
        spawnRate: clamp(common.spawnRate, 1, 10),
        targetScore: clamp(common.targetScore, 30, 1000),
      };
    case "memory": {
      const pairs = common.pairs.filter((p) => p.a.trim() && p.b.trim());
      return {
        ...common,
        pairs: pairs.length >= 2 ? pairs : [{ a: "🍎", b: "🍎" }, { a: "🍌", b: "🍌" }, { a: "🍇", b: "🍇" }],
      };
    }
  }
}

/** Options picked on the Customize screen. */
export type CustomizeOptions = {
  prompt: string;
  type: GameType | null;
  theme: Theme | "surprise";
  difficulty: Difficulty;
  hero: string;
  lives: boolean;
  timer: boolean;
  bonus: boolean;
  levels: number;
};
