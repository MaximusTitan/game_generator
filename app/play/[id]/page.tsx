import { Suspense } from "react";
import { SharedGame } from "@/components/studio/shared-game";

export default function PlayPage({ params }: PageProps<"/play/[id]">) {
  return (
    <Suspense fallback={<p className="hand p-10 text-center text-2xl text-muted">Loading game…</p>}>
      <SharedGame params={params} />
    </Suspense>
  );
}
