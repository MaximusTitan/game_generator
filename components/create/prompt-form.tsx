"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GAME_TYPES, GAME_TYPE_INFO, type GameType } from "@/lib/games/spec";

const IDEAS: Array<{ icon: string; text: string; type: GameType }> = [
  { icon: "🌠", text: "Catch the falling stars and dodge space rocks", type: "catch" },
  { icon: "🏎️", text: "A jungle race with three cars", type: "race" },
  { icon: "🐉", text: "Dragon maths quiz for 8 year olds", type: "quiz" },
  { icon: "🍎", text: "Match the fruit pairs", type: "memory" },
  { icon: "🌍", text: "Capital cities of Europe quiz", type: "quiz" },
  { icon: "🥐", text: "Match French words to English", type: "memory" },
];

type Recognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
};

export function PromptForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<GameType | null>(null);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanListen(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  function toggleMic() {
    if (listening) return recognition.current?.stop();
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.interimResults = false;
    r.onresult = (e) => setPrompt((p) => `${p ? p + " " : ""}${e.results[0][0].transcript}`);
    r.onend = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  }

  function submit(text = prompt, chosen = type) {
    const trimmed = text.trim();
    if (trimmed.length < 3) return;
    const params = new URLSearchParams({ prompt: trimmed });
    if (chosen) params.set("type", chosen);
    router.push(`/create?${params}`);
  }

  return (
    <form
      className="mt-8 flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative rounded-2xl border-2 border-brand bg-card p-1 shadow-[3px_3px_0_var(--brand)] focus-within:ring-4 focus-within:ring-brand-soft">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          maxLength={500}
          aria-label="Describe your game"
          placeholder="A space game where I catch falling stars and dodge rocks…"
          className="hand w-full resize-none bg-transparent px-4 py-3 pr-16 text-xl outline-none placeholder:text-muted/70"
        />
        {canListen && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop listening" : "Say your idea"}
            className={`btn absolute bottom-3 right-3 !px-2.5 !py-1.5 ${listening ? "btn-sun animate-pulse" : ""}`}
          >
            🎤
          </button>
        )}
      </div>

      <div>
        <p className="hand mb-2 text-lg">Game type <span className="text-sm text-muted">(or let the genie pick)</span></p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GAME_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(type === t ? null : t)}
              className="chip"
              title={GAME_TYPE_INFO[t].blurb}
            >
              <span aria-hidden>{GAME_TYPE_INFO[t].icon}</span> {GAME_TYPE_INFO[t].label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={prompt.trim().length < 3} className="btn btn-primary mx-auto !px-10 !py-3 !text-2xl">
        ✨ Make my game
      </button>

      <div>
        <p className="hand mb-2 text-lg">Need ideas? Tap one!</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {IDEAS.map((idea) => (
            <button
              key={idea.text}
              type="button"
              onClick={() => submit(idea.text, idea.type)}
              className="sketch flex items-center gap-3 !bg-sun px-3 py-3 text-left transition-transform hover:-translate-y-0.5"
            >
              <span className="text-3xl" aria-hidden>
                {idea.icon}
              </span>
              <span className="hand text-lg leading-tight">{idea.text}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
