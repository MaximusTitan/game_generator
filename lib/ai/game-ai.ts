import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  GAME_TYPES,
  GAME_TYPE_INFO,
  normalizeSpec,
  specSchemaFor,
  type CustomizeOptions,
  type GameSpec,
  type GameType,
} from "@/lib/games/spec";

// Any AI Gateway model id works here; requests are routed and billed by the gateway.
const MODEL = process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-sonnet-5.5";

const DESIGNER = `You are Game Genie, a friendly game designer for kids and teachers.
You turn a short idea into a complete, playable game by filling in a JSON game spec.
The spec is rendered by a fixed game engine, so you never write code: you only choose content and settings.

Rules:
- Content must be age-appropriate for children: no violence beyond cartoon bumps, no scary, adult or hateful content.
- All visuals are emojis. Pick emojis that match the idea and theme and render on all devices.
- Keep text short and simple. Use cheerful, encouraging language.
- Quiz questions must be factually correct, with exactly one right answer, and match the requested topic and difficulty.
- Follow the player's chosen options exactly when they are given.`;

/** Pick a game type for prompts where the player didn't choose one. */
export async function pickGameType(prompt: string): Promise<GameType> {
  const { output } = await generateText({
    model: MODEL,
    output: Output.choice({ options: [...GAME_TYPES] }),
    instructions:
      "Classify which game type best fits the idea. Options: " +
      GAME_TYPES.map((t) => `${t} (${GAME_TYPE_INFO[t].blurb})`).join("; ") +
      ". Learning or trivia ideas are quiz; driving, running or racing ideas are race; falling objects to catch are catch; pairs or matching are memory.",
    prompt,
  });
  return output as GameType;
}

function describeOptions(o: CustomizeOptions) {
  const lines = [
    `Idea: "${o.prompt}"`,
    o.theme === "surprise" ? "Theme: pick the best fit for the idea" : `Theme: ${o.theme}`,
    `Difficulty: ${o.difficulty}`,
    o.hero ? `Player character emoji: ${o.hero}` : "Player character: pick one that fits",
    `Lives: ${o.lives ? "3" : "0 (unlimited)"}`,
    `Timer: ${o.timer ? "on (choose a fair time limit per level)" : "0 (off)"}`,
    `Bonus stars / power-ups: ${o.bonus ? "yes" : "no"}`,
    `Levels: ${o.levels}`,
  ];
  return lines.join("\n");
}

export async function generateGame(options: CustomizeOptions & { type: GameType }): Promise<GameSpec> {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: specSchemaFor[options.type] as z.ZodType<GameSpec> }),
    instructions: DESIGNER,
    prompt: `Design a ${GAME_TYPE_INFO[options.type].label} game (type "${options.type}").\n\n${describeOptions(options)}`,
  });
  return normalizeSpec(output);
}

export const editResult = z.object({
  reply: z.string().describe("One or two short, cheerful sentences telling the player what changed"),
});

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function editGame(spec: GameSpec, instruction: string, history: ChatTurn[]) {
  const schema = z.object({
    reply: editResult.shape.reply,
    spec: specSchemaFor[spec.type] as z.ZodType<GameSpec>,
  });

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema }),
    instructions: `${DESIGNER}

You are now editing an existing game. Apply the player's change request to the current spec and return the full updated spec.
- Change only what was asked; keep everything else the same.
- The game type ("${spec.type}") cannot change. If they ask for a different kind of game, explain kindly that they can make a new game for that, and keep the spec as it is.
- "Faster" / "slower" maps to speed, fallSpeed or timerSeconds; "more lives" to lives; "add a level" to levels (and add matching questions or pairs for quizzes and memory games).
- If the request is unclear or not allowed, keep the spec unchanged and say so in the reply.`,
    messages: [
      ...history.slice(-8).map((t) => ({ role: t.role, content: t.content })),
      {
        role: "user" as const,
        content: `Current game spec:\n${JSON.stringify(spec)}\n\nChange request: ${instruction}`,
      },
    ],
  });

  const result = output as { reply: string; spec: GameSpec };
  return { reply: result.reply, spec: normalizeSpec({ ...result.spec, type: spec.type } as GameSpec) };
}
