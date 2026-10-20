import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  GAME_TYPES,
  GAME_TYPE_INFO,
  normalizeSpec,
  SUBJECT_INFO,
  specSchemaFor,
  type CustomizeOptions,
  type GameSpec,
  type GameType,
} from "@/lib/games/spec";

// Any AI Gateway model id works here; requests are routed and billed by the gateway.
const MODEL = process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-sonnet-5.5";

const DESIGNER = `You are Game Gen, a designer of educational games for kids, students and teachers.
You turn a learning idea into a complete, playable learning game by filling in a JSON game spec.
The spec is rendered by a fixed game engine, so you never write code: you only choose content and settings.

Game Gen only makes educational games. The learning IS the game, not decoration: every point the player
scores must come from showing knowledge of the subject.
- Quiz: questions that test the learning goal, each with a one-sentence explanation of why the answer is right.
- Race: answer gates where the player steers into the lane with the right answer. Obstacles, pickups and rivals should fit the topic too.
- Catcher: a clear sorting rule ("Catch even numbers!", "Catch the mammals!"). Good items follow the rule; bad items break it and look similar enough that the player has to think.
- Memory: pairs that connect two different things (term/definition, word/translation, country/capital), never identical cards.
- Always fill subject, learningGoal and 3-5 true "Did you know?" facts that teach more about the topic.
- Pitch vocabulary, questions and facts at the age group and difficulty given. Content builds up level by level.

Rules:
- Content must be age-appropriate: no violence beyond cartoon bumps, no scary, adult or hateful content.
- All visuals are emojis. Pick emojis that match the topic and theme and render on all devices.
- Keep text short and simple. Use cheerful, encouraging language.
- Every question and fact must be factually correct, with exactly one right answer.
- Follow the player's chosen options exactly when they are given.`;

const ideaCheck = z.object({
  educational: z
    .boolean()
    .describe("True if a real, safe learning game can be made from this idea and subject"),
  type: z.enum(GAME_TYPES).describe("Game type that best fits the idea"),
  learningGoal: z.string().describe("What players will learn, one short sentence. Empty if not educational."),
  suggestion: z
    .string()
    .describe(
      "If not educational: the idea reworked into a learning game in the chosen subject, written like a player's idea, max 80 characters. Otherwise empty.",
    ),
});

export type IdeaCheck = z.infer<typeof ideaCheck>;

/** Gate: only educational ideas become games. Also picks the game type if the player didn't. */
export async function checkIdea(o: CustomizeOptions): Promise<IdeaCheck> {
  const subject = o.subject ? SUBJECT_INFO[o.subject].label : null;
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: ideaCheck }),
    instructions: `Game Gen only makes educational games. Decide if this idea can become a real learning game${subject ? ` in ${subject}` : ""} for ages ${o.age}.
- Educational: the idea names something to learn or practise (a fact topic, skill, vocabulary, concept), or a fun theme that clearly carries the chosen subject ("space race" + Maths = maths answer race in space is fine).
- Not educational: the idea is only about fun with nothing to learn and no subject ties in, it asks for no learning ("just a shooting game", "no questions"), it is off-topic nonsense, or it is unsafe, violent, scary, adult or hateful. Unsafe ideas always get a wholesome suggestion instead.
- learningGoal: one concrete goal pitched at ages ${o.age}, e.g. "Practise the 7 times table".

Then pick the game type: ${GAME_TYPES.map((t) => `${t} (${GAME_TYPE_INFO[t].blurb})`).join("; ")}. Driving or racing ideas are race; sorting or catching ideas are catch; pairs or matching are memory; everything else is quiz.${o.type ? ` The player already chose "${o.type}", so return that type.` : ""}`,
    prompt: `Subject: ${subject ?? "not chosen"}\nIdea: "${o.prompt}"`,
  });
  return { ...output, type: o.type ?? output.type };
}

function describeOptions(o: CustomizeOptions & { learningGoal?: string }) {
  const lines = [
    `Idea: "${o.prompt}"`,
    `Subject: ${o.subject ? SUBJECT_INFO[o.subject].label : "pick from the idea"}`,
    `Learning goal: ${o.learningGoal || "pick the most useful one for the idea"}`,
    `Age group: ${o.age}`,
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

export async function generateGame(
  options: CustomizeOptions & { type: GameType; learningGoal: string },
): Promise<GameSpec> {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: specSchemaFor[options.type] as z.ZodType<GameSpec> }),
    instructions: DESIGNER,
    prompt: `Design an educational ${GAME_TYPE_INFO[options.type].label} game (type "${options.type}").\n\n${describeOptions(options)}`,
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
- "Faster" / "slower" maps to speed, fallSpeed or timerSeconds; "more lives" to lives; "add a level" to levels (and add matching questions or pairs for quizzes, races and memory games).
- The game must stay educational. Changing the topic, adding questions, or making it easier or harder is fine. If a request would remove or water down the learning (e.g. "no questions", "just random emojis", "make it a shooting game"), keep the learning content unchanged and kindly explain that Game Gen games always teach something.
- If the topic changes, update subject, learningGoal, facts and all the learning content to match.
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
