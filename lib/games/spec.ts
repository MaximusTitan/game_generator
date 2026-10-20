import { z } from "zod";

/**
 * A game is data, not code: the AI fills in one of these specs and the
 * matching engine in components/games renders it. Keeping the AI on a schema
 * means every generated game is playable and safe to run.
 *
 * Game Gen only makes educational games. Every spec carries a subject, a
 * learning goal and facts, and every engine's core mechanic tests knowledge:
 * quiz questions with explanations, race answer gates, a catch sorting rule
 * and memory pairs that connect two different things.
 */

export const GAME_TYPES = ["quiz", "race", "catch", "memory"] as const;
export type GameType = (typeof GAME_TYPES)[number];

export const GAME_TYPE_INFO: Record<GameType, { label: string; icon: string; blurb: string }> = {
  quiz: { label: "Quiz", icon: "❓", blurb: "Answer questions and learn why each answer is right" },
  race: { label: "Answer race", icon: "🏎️", blurb: "Steer into the lane with the right answer to win" },
  catch: { label: "Sort & catch", icon: "⭐", blurb: "Catch what fits the rule, dodge what doesn't" },
  memory: { label: "Memory match", icon: "🃏", blurb: "Match terms to meanings, words to translations" },
};

export const SUBJECTS = [
  "maths",
  "science",
  "reading",
  "languages",
  "geography",
  "history",
  "nature",
  "space",
  "health",
  "arts",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_INFO: Record<Subject, { label: string; icon: string; example: string }> = {
  maths: { label: "Maths", icon: "🔢", example: "A dragon quiz on the 7 times table" },
  science: { label: "Science", icon: "🔬", example: "Sort solids, liquids and gases" },
  reading: { label: "Reading & spelling", icon: "📖", example: "Catch the words that rhyme with cat" },
  languages: { label: "Languages", icon: "🗣️", example: "Match Spanish animal words to English" },
  geography: { label: "Geography", icon: "🌍", example: "Race through the capital cities of Europe" },
  history: { label: "History", icon: "🏛️", example: "Ancient Egypt quiz with mummies and pyramids" },
  nature: { label: "Animals & nature", icon: "🐾", example: "Match baby animals to their parents" },
  space: { label: "Space", icon: "🪐", example: "Catch the planets, dodge the asteroids" },
  health: { label: "Health & food", icon: "🥦", example: "Catch healthy foods for a strong body" },
  arts: { label: "Art & music", icon: "🎨", example: "Match instruments to their families" },
};

export const AGE_GROUPS = ["4-6", "7-9", "10-12", "13+"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const THEMES = ["space", "jungle", "ocean", "candy", "city", "desert", "snow"] as const;
export type Theme = (typeof THEMES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// Numeric ranges live in descriptions (not .min/.max) because provider
// structured-output modes reject some JSON-schema keywords. normalizeSpec()
// clamps everything afterwards.
const base = {
  title: z.string().describe("Short, catchy game title (max 4 words)"),
  subject: z.string().describe("The subject and topic taught, e.g. Maths: 7 times table, Science: states of matter"),
  learningGoal: z
    .string()
    .describe('One short sentence starting with a verb saying what players learn, e.g. "Practise the 7 times table"'),
  facts: z
    .array(z.string())
    .describe("3-5 short, true facts that teach more about the topic, shown as 'Did you know?' after playing"),
  theme: z.enum(THEMES),
  difficulty: z.enum(DIFFICULTIES),
  hero: z.string().describe("A single emoji for the player character"),
  heroName: z.string().describe("Fun name for the player character"),
  howToPlay: z.array(z.string()).describe("2-4 very short instructions the target age understands"),
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

const gateQuestion = z.object({
  question: z.string().describe("Short question, max 60 characters"),
  choices: z.array(z.string()).describe("Exactly 3 answer choices, each max 14 characters"),
  answer: z.number().int().describe("0-based index of the correct choice"),
});

export const raceSpec = z.object({
  type: z.literal("race"),
  ...base,
  questions: z
    .array(gateQuestion)
    .describe("Answer gates the player steers through, testing the learning goal. Provide levels x 3 questions, getting harder each level."),
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
  rule: z
    .string()
    .describe('The learning rule shown on screen, max 50 characters, e.g. "Catch even numbers!" or "Catch the mammals!"'),
  goodItems: z
    .array(z.string())
    .describe("4-8 items that fit the rule: an emoji or a very short word/number (max 10 characters), e.g. 4, 12, 🐬, cat"),
  badItems: z
    .array(z.string())
    .describe("4-8 items that break the rule but look similar, so players must think, e.g. 7, 15, 🦈, kat"),
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
      "Learning pairs: term/definition, word/translation, question/answer, animal/habitat, country/capital etc. The two sides must never be identical. Keep each side under 24 characters. Provide levels x 6 pairs.",
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

/**
 * Fill learning fields on specs saved before every game was a learning game,
 * so older games still load, play and edit.
 */
export function withLearningDefaults<T>(raw: T): T {
  if (!raw || typeof raw !== "object") return raw;
  const s = raw as Record<string, unknown>;
  return {
    ...s,
    subject: typeof s.subject === "string" ? s.subject : "General knowledge",
    learningGoal: typeof s.learningGoal === "string" ? s.learningGoal : "",
    facts: Array.isArray(s.facts) ? s.facts : [],
    ...(s.type === "race" && { questions: Array.isArray(s.questions) ? s.questions : [] }),
    ...(s.type === "catch" && { rule: typeof s.rule === "string" ? s.rule : "Catch the good stuff!" }),
  } as T;
}

/** Clamp AI output into ranges the engines can always handle. */
export function normalizeSpec(raw: GameSpec): GameSpec {
  const spec = withLearningDefaults(raw);
  const common = {
    ...spec,
    subject: spec.subject.trim().slice(0, 40) || "General knowledge",
    learningGoal: spec.learningGoal.trim().slice(0, 160),
    facts: spec.facts.map((f) => f.trim()).filter(Boolean).slice(0, 6),
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
        questions: common.questions
          .filter((q) => q.question.trim() && q.choices.length >= 2)
          .map((q) => ({
            ...q,
            choices: q.choices.slice(0, 3),
            answer: clamp(q.answer, 0, Math.min(2, q.choices.length - 1)),
          })),
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
        rule: common.rule.trim().slice(0, 60) || "Catch the good stuff!",
        goodItems: nonEmpty(common.goodItems, ["⭐"]).slice(0, 8),
        badItems: nonEmpty(common.badItems, ["☄️"]).slice(0, 8),
        fallSpeed: clamp(common.fallSpeed, 1, 10),
        spawnRate: clamp(common.spawnRate, 1, 10),
        targetScore: clamp(common.targetScore, 30, 1000),
      };
    case "memory": {
      // Identical cards teach nothing; drop them when there are enough real pairs.
      const filled = common.pairs.filter((p) => p.a.trim() && p.b.trim());
      const learning = filled.filter((p) => p.a.trim() !== p.b.trim());
      const pairs = learning.length >= 2 ? learning : filled;
      return {
        ...common,
        pairs: pairs.length >= 2 ? pairs : [{ a: "🍎", b: "apple" }, { a: "🍌", b: "banana" }, { a: "🍇", b: "grapes" }],
      };
    }
  }
}

/** Options picked on the Customize screen. */
export type CustomizeOptions = {
  prompt: string;
  subject: Subject | null;
  age: AgeGroup;
  type: GameType | null;
  theme: Theme | "surprise";
  difficulty: Difficulty;
  hero: string;
  lives: boolean;
  timer: boolean;
  bonus: boolean;
  levels: number;
};
