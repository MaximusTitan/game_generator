"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AGE_GROUPS,
  GAME_TYPES,
  GAME_TYPE_INFO,
  SUBJECTS,
  SUBJECT_INFO,
  type AgeGroup,
  type GameType,
  type Subject,
} from "@/lib/games/spec";

type Idea = { icon: string; text: string; type: GameType; subject: Subject; age: AgeGroup };

const IDEAS: Idea[] = [
  { icon: "🔢", text: "Catch the even numbers, dodge the odd ones", type: "catch", subject: "maths", age: "7-9" },
  { icon: "🏎️", text: "Jungle race through the times tables", type: "race", subject: "maths", age: "7-9" },
  { icon: "🪐", text: "Space quiz on the planets of the solar system", type: "quiz", subject: "space", age: "7-9" },
  { icon: "🐾", text: "Match animals to their habitats", type: "memory", subject: "nature", age: "4-6" },
  { icon: "🌍", text: "Capital cities of Europe quiz", type: "quiz", subject: "geography", age: "10-12" },
  { icon: "🥐", text: "Match French words to English", type: "memory", subject: "languages", age: "10-12" },
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
  const [subject, setSubject] = useState<Subject | null>(null);
  const [age, setAge] = useState<AgeGroup>("7-9");
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

  const ready = prompt.trim().length >= 3 && subject !== null;

  function submit(text = prompt, chosen = type, chosenSubject = subject, chosenAge = age) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || !chosenSubject) return;
    const params = new URLSearchParams({ prompt: trimmed, subject: chosenSubject, age: chosenAge });
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
      <div>
        <p className="hand mb-2 text-lg">
          1. What do you want to learn? <span className="text-sm text-muted">(pick a subject)</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={subject === s}
              onClick={() => setSubject(subject === s ? null : s)}
              className="chip !justify-start text-sm"
            >
              <span aria-hidden>{SUBJECT_INFO[s].icon}</span> {SUBJECT_INFO[s].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="hand mb-2 text-lg">2. Who is it for?</p>
        <div className="flex flex-wrap gap-2">
          {AGE_GROUPS.map((a) => (
            <button key={a} type="button" aria-pressed={age === a} onClick={() => setAge(a)} className="chip min-w-24">
              Ages {a}
            </button>
          ))}
        </div>
      </div>

      <p className="hand -mb-4 text-lg">3. Describe the game and the topic</p>
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
          aria-label="Describe your learning game"
          placeholder={`${subject ? SUBJECT_INFO[subject].example : "A dragon quiz on the 7 times table"}…`}
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
        <p className="hand mb-2 text-lg">Game style <span className="text-sm text-muted">(or let Game Gen pick)</span></p>
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

      <div className="flex flex-col items-center gap-1">
        <button type="submit" disabled={!ready} className="btn btn-primary !px-10 !py-3 !text-2xl">
          🎓 Make my learning game
        </button>
        {!subject && prompt.trim().length >= 3 && <p className="text-sm text-muted">Pick a subject first ☝️</p>}
      </div>

      <div>
        <p className="hand mb-2 text-lg">Need ideas? Tap one!</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {IDEAS.map((idea) => (
            <button
              key={idea.text}
              type="button"
              onClick={() => submit(idea.text, idea.type, idea.subject, idea.age)}
              className="sketch flex items-center gap-3 !bg-sun px-3 py-3 text-left transition-transform hover:-translate-y-0.5"
            >
              <span className="text-3xl" aria-hidden>
                {idea.icon}
              </span>
              <span className="flex flex-col">
                <span className="hand text-lg leading-tight">{idea.text}</span>
                <span className="text-xs text-muted">
                  {SUBJECT_INFO[idea.subject].label} · Ages {idea.age}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
