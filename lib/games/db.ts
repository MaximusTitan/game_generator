import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameSpec, GameType } from "./spec";

export type GameRow = {
  id: string;
  user_id: string;
  title: string;
  type: GameType;
  prompt: string;
  spec: GameSpec;
  is_public: boolean;
  remixed_from: string | null;
  created_at: string;
  updated_at: string;
};

/** Copy a game into the signed-in user's collection. Returns the new id. */
export async function remixGame(supabase: SupabaseClient, game: GameRow) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not-signed-in");
  const title = game.user_id === auth.user.id ? `${game.title} (copy)` : `${game.title} remix`;
  const { data, error } = await supabase
    .from("games")
    .insert({
      user_id: auth.user.id,
      title,
      type: game.type,
      prompt: game.prompt,
      spec: { ...game.spec, title },
      remixed_from: game.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export function shareUrl(id: string) {
  return `${window.location.origin}/play/${id}`;
}
