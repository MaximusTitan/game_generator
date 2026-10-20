import { Suspense } from "react";
import { CustomizeGame } from "@/components/create/customize-game";

export const metadata = { title: "Make it yours · Game Gen" };

export default function CreatePage() {
  return (
    <Suspense fallback={<p className="hand p-10 text-center text-2xl text-muted">Loading…</p>}>
      <CustomizeGame />
    </Suspense>
  );
}
