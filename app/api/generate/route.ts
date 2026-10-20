import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIdea, generateGame } from "@/lib/ai/game-ai";
import { AGE_GROUPS, DIFFICULTIES, GAME_TYPES, SUBJECTS, THEMES } from "@/lib/games/spec";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const body = z.object({
  prompt: z.string().trim().min(3, "Describe your game in a few words").max(500),
  subject: z.enum(SUBJECTS, "Pick a subject to learn"),
  age: z.enum(AGE_GROUPS),
  type: z.enum(GAME_TYPES).nullable(),
  theme: z.enum([...THEMES, "surprise"]),
  difficulty: z.enum(DIFFICULTIES),
  hero: z.string().max(16),
  lives: z.boolean(),
  timer: z.boolean(),
  bonus: z.boolean(),
  levels: z.number().int().min(1).max(10),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const options = parsed.data;

  try {
    // Only learning games get made: the idea must teach something in the chosen subject.
    const idea = await checkIdea(options);
    if (!idea.educational) {
      return NextResponse.json(
        {
          error: "Game Gen only makes learning games. Tell it what players should learn or practise.",
          suggestion: idea.suggestion || null,
        },
        { status: 422 },
      );
    }
    const type = idea.type;
    const spec = await generateGame({ ...options, type, learningGoal: idea.learningGoal });

    const { data, error } = await supabase
      .from("games")
      .insert({ user_id: user.id, title: spec.title, type, prompt: options.prompt, spec })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id, spec });
  } catch (err) {
    console.error("generate failed", err);
    return NextResponse.json(
      { error: "Game Gen got confused making that game. Please try again!" },
      { status: 502 },
    );
  }
}
