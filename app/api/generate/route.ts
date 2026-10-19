import { NextResponse } from "next/server";
import { z } from "zod";
import { generateGame, pickGameType } from "@/lib/ai/game-ai";
import { DIFFICULTIES, GAME_TYPES, THEMES } from "@/lib/games/spec";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const body = z.object({
  prompt: z.string().trim().min(3, "Describe your game in a few words").max(500),
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
    const type = options.type ?? (await pickGameType(options.prompt));
    const spec = await generateGame({ ...options, type });

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
      { error: "The genie got confused making that game. Please try again!" },
      { status: 502 },
    );
  }
}
