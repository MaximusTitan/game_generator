# Game Genie

Type an idea ("a jungle race with three cars") and Game Genie builds a playable game: a **quiz**, a **race**, a **catcher** or a **memory match**. Players can then tweak it by chatting ("make it faster"), save it, and share it with a link or QR code.

Built with Next.js 16, React 19, Tailwind CSS 4, Phaser 4, Supabase (auth + Postgres) and the Vercel AI Gateway (via the AI SDK).

## How it works

The AI never writes code. It fills in a typed game spec (`lib/games/spec.ts`) using structured output, and a fixed engine renders it:

| Type   | Engine                                   |
| ------ | ---------------------------------------- |
| race   | Phaser scene, `components/games/race-scene.ts`  |
| catch  | Phaser scene, `components/games/catch-scene.ts` |
| quiz   | React, `components/games/quiz-game.tsx`         |
| memory | React, `components/games/memory-game.tsx`       |

Editing with chat sends the current spec plus the request to `/api/edit`, which returns an updated spec. Every edit is a new version you can undo or redo before saving.

## Setup

1. Create a Supabase project, open the SQL editor and run `supabase/migrations/0001_games.sql`.
2. Create an AI Gateway API key at https://vercel.com/ai-gateway.
3. Copy `.env.example` to `.env.local` and fill in the values:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SECRET_KEY` (or the legacy service role key as `SUPABASE_SERVICE_ROLE_KEY`). Server only.
   - `AI_GATEWAY_API_KEY`, and optionally `AI_GATEWAY_MODEL` (defaults to `anthropic/claude-sonnet-5.5`)
4. `pnpm install` then `pnpm dev`.

### Sign up without email verification

`/api/auth/signup` creates users with the Supabase admin API and `email_confirm: true`, so accounts are verified straight away and the browser signs in immediately. No confirmation email is sent, whatever the "Confirm email" setting in Supabase is.

## Routes

- `/` prompt screen · `/create` customize and generate · `/games/[id]` play and edit with chat (owner only)
- `/play/[id]` public player for shared games (anyone with the link) · `/my-games` your games, share link, QR, remix
- `/login`, `/signup`
