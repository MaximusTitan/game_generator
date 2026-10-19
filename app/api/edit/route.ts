import { NextResponse } from "next/server";
import { z } from "zod";
import { editGame } from "@/lib/ai/game-ai";
import { gameSpec, type GameSpec } from "@/lib/games/spec";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const body = z.object({
  spec: gameSpec,
  instruction: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(20)
    .default([]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That change request didn't make sense to me." }, { status: 400 });
  }

  try {
    const result = await editGame(parsed.data.spec as GameSpec, parsed.data.instruction, parsed.data.history);
    return NextResponse.json(result);
  } catch (err) {
    console.error("edit failed", err);
    return NextResponse.json({ error: "Oops, I couldn't make that change. Try saying it another way!" }, { status: 502 });
  }
}
