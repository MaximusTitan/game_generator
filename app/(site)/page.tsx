import { PromptForm } from "@/components/create/prompt-form";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      <h1 className="hand text-center text-4xl sm:text-5xl">What do you want to learn today?</h1>
      <p className="mt-2 text-center text-muted">
        Pick a subject, describe your game, and Game Gen builds a learning game you can play and share. No coding
        needed.
      </p>
      <PromptForm />
    </div>
  );
}
