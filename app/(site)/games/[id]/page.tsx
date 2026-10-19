import { Suspense } from "react";
import { GameStudio } from "@/components/studio/game-studio";

export default function GamePage({ params }: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<p className="hand p-10 text-center text-2xl text-muted">Loading your game…</p>}>
      <GameStudio params={params} />
    </Suspense>
  );
}
