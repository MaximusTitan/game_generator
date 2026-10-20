import Image from "next/image";
import Link from "next/link";
import { PromptForm } from "@/components/create/prompt-form";
import { GAME_TYPES, GAME_TYPE_INFO, SUBJECTS, SUBJECT_INFO } from "@/lib/games/spec";

const STEPS = [
  { icon: "🧠", title: "Pick a subject", text: "Maths, science, spelling, history… choose what you want to learn and who it's for." },
  { icon: "💬", title: "Describe your game", text: "Type or say your idea, like “a jungle race through the 7 times table”." },
  { icon: "🎮", title: "Play and share", text: "GameGen builds it in seconds. Tweak it, play it, then share a link or QR code." },
];

const GAME_TYPE_STYLE: Record<(typeof GAME_TYPES)[number], string> = {
  quiz: "bg-brand-soft",
  race: "bg-sun",
  catch: "bg-mint",
  memory: "bg-sky",
};

const FEATURES = [
  { icon: "✅", title: "Learning first", text: "Every game teaches something real, and every answer explains why it's right." },
  { icon: "🛡️", title: "Safe by design", text: "Games are built from a fixed set of kid-friendly templates, so nothing weird sneaks in." },
  { icon: "🎤", title: "Just say it", text: "Little ones can speak their idea out loud instead of typing it." },
  { icon: "🔗", title: "Share in a tap", text: "Send a link or show a QR code so a whole class can play on any device." },
  { icon: "🎨", title: "Make it yours", text: "Pick a theme like space, jungle or candy and tune the difficulty." },
  { icon: "⚡", title: "No coding needed", text: "From idea to playable game in seconds. No setup, no downloads." },
];

export default function Home() {
  return (
    <div className="overflow-x-clip">
      <Hero />
      <SubjectStrip />
      <HowItWorks />
      <GameStyles />
      <Features />
      <MakeSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="dot-grid relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-pink/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[-10%] h-80 w-80 rounded-full bg-grape/20 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="pop-in text-center lg:text-left">
          <span className="sketch-flat hand inline-flex items-center gap-2 !rounded-full px-3 py-1 text-base">
            <span aria-hidden>✨</span> AI learning games for kids aged 4–12
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Turn any lesson into a <span className="text-gradient">game</span> in seconds.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted text-pretty lg:mx-0">
            Describe the game you want to play and GameGen builds it: quizzes, answer races, sorting games and memory
            matches that make learning feel like playtime.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a href="#make" className="btn btn-gradient !px-7 !py-3 !text-2xl">
              🎮 Make a game, free
            </a>
            <a href="#how" className="btn !px-6 !py-3 !text-xl">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">No coding · Works on phones, tablets and laptops</p>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

/** A static mock of a generated quiz, so visitors see the product before signing up. */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="sketch relative overflow-hidden">
        <div className="brand-gradient flex items-center justify-between px-4 py-3 text-white">
          <span className="hand text-xl">🪐 Planet Quiz</span>
          <span className="hand rounded-full bg-white/20 px-3 py-0.5">⭐ 120</span>
        </div>
        <div className="bg-[#1e1b4b] px-5 pb-6 pt-5 text-white">
          <div className="mb-4 flex gap-1.5">
            {[1, 1, 1, 0, 0].map((done, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${done ? "bg-[#facc15]" : "bg-white/20"}`} />
            ))}
          </div>
          <p className="hand text-2xl leading-snug">Which planet is known as the Red Planet?</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {["Venus", "Mars", "Jupiter", "Saturn"].map((answer) => (
              <span
                key={answer}
                className={`hand rounded-xl border-2 px-3 py-2.5 text-center text-lg ${
                  answer === "Mars"
                    ? "border-[#4ade80] bg-[#4ade80]/25"
                    : "border-white/30 bg-white/5"
                }`}
              >
                {answer === "Mars" && "✓ "}
                {answer}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm">
            💡 Mars looks red because its soil is full of iron oxide: rust!
          </p>
        </div>
      </div>
      <span
        className="float sketch hand absolute -left-2 -top-6 bg-sun px-3 py-1.5 text-lg [--tilt:-6deg] sm:-left-10"
      >
        🏎️ Answer race
      </span>
      <span
        className="float sketch hand absolute -bottom-5 -right-2 bg-mint px-3 py-1.5 text-lg [--tilt:5deg] [animation-delay:-2s] sm:-right-8"
      >
        🃏 Memory match
      </span>
    </div>
  );
}

function SubjectStrip() {
  const items = [...SUBJECTS, ...SUBJECTS];
  return (
    <section aria-label="Subjects" className="border-y-2 border-line bg-card py-4">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <ul className="marquee flex w-max gap-3">
          {items.map((s, i) => (
            <li
              key={i}
              aria-hidden={i >= SUBJECTS.length}
              className="hand flex shrink-0 items-center gap-2 rounded-full border-2 border-line px-4 py-1.5 text-lg"
            >
              <span aria-hidden>{SUBJECT_INFO[s].icon}</span> {SUBJECT_INFO[s].label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionHeading({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="hand text-xl text-pink">{kicker}</p>
      <h2 className="mt-1 text-3xl font-black tracking-tight text-balance sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-muted text-pretty">{text}</p>}
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20">
      <SectionHeading kicker="How it works" title="From idea to game in three steps" />
      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="sketch relative p-6 pt-8">
            <span className="brand-gradient hand absolute -top-5 left-6 grid h-10 w-10 place-items-center rounded-full border-2 border-line text-xl text-white">
              {i + 1}
            </span>
            <span className="text-4xl" aria-hidden>
              {step.icon}
            </span>
            <h3 className="mt-3 text-xl font-extrabold">{step.title}</h3>
            <p className="mt-1 text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GameStyles() {
  return (
    <section className="border-y-2 border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeading
          kicker="Game styles"
          title="Four ways to play, endless things to learn"
          text="Let GameGen pick the best style for your topic, or choose one yourself."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_TYPES.map((t) => (
            <li
              key={t}
              className={`sketch ${GAME_TYPE_STYLE[t]} p-6 transition-transform duration-150 hover:-translate-y-1`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-line bg-card text-3xl">
                {GAME_TYPE_INFO[t].icon}
              </span>
              <h3 className="hand mt-4 text-2xl">{GAME_TYPE_INFO[t].label}</h3>
              <p className="mt-1 text-sm text-ink/75">{GAME_TYPE_INFO[t].blurb}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeading kicker="Why GameGen" title="Built for curious kids, loved by grown-ups" />
      <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-4">
            <span className="sketch-flat grid h-12 w-12 shrink-0 place-items-center text-2xl" aria-hidden>
              {f.icon}
            </span>
            <div>
              <h3 className="text-lg font-extrabold">{f.title}</h3>
              <p className="mt-0.5 text-muted">{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MakeSection() {
  return (
    <section id="make" className="scroll-mt-6 px-4 pb-20">
      <div className="sketch mx-auto max-w-4xl px-5 py-10 sm:px-10">
        <SectionHeading kicker="Your turn" title="What do you want to learn today?" />
        <PromptForm />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="brand-gradient relative mx-auto max-w-6xl overflow-hidden rounded-3xl border-2 border-line px-6 py-14 text-center text-white shadow-[4px_4px_0_var(--line)]">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 text-[10rem] opacity-15">
          🎮
        </div>
        <h2 className="relative text-3xl font-black tracking-tight text-balance sm:text-4xl">
          Ready to make learning fun?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/85">
          Create your first game in under a minute. Save your favourites and share them with friends or a whole class.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn !px-7 !py-3 !text-2xl text-ink">
            Sign up free
          </Link>
          <a href="#make" className="hand text-xl underline decoration-2 underline-offset-4 hover:text-white/80">
            or just start making →
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <Image src="/logo.png" alt="GameGen" width={1277} height={238} className="h-7 w-auto" />
        <nav className="hand flex gap-5 text-lg">
          <a href="#how" className="hover:text-brand">
            How it works
          </a>
          <a href="#make" className="hover:text-brand">
            Make a game
          </a>
          <Link href="/login" className="hover:text-brand">
            Log in
          </Link>
        </nav>
        <p className="text-sm text-muted">Made for curious kids everywhere</p>
      </div>
    </footer>
  );
}
