# Game Gen

Type an idea ("a jungle race with three cars") and Game Gen builds a playable game: a **quiz**, a **race**, a **catcher** or a **memory match**. Players can then tweak it by chatting ("make it faster"), save it, and share it with a link or QR code.

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

### Email verification

Sign up uses Supabase's built-in email confirmation. New users see a "check your email" screen (with a resend button) and can't log in until they click the link, which lands on `/auth/confirm`, signs them in and sends them where they were going.

In the Supabase dashboard:

1. **Authentication → Sign In / Providers → Email**: keep **Confirm email** on. (If it's off, sign up skips verification and signs in straight away.)
2. **Authentication → URL Configuration**: set **Site URL** to your app's URL and add `http://localhost:3000/**` (plus your production URL with `/**`) to **Redirect URLs**.
3. **Authentication → Emails → Confirm signup** (recommended): change the link's `href` to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
   The default template's link uses a PKCE code, which only works when opened in the same browser that signed up; the `token_hash` link works anywhere (users land on the home page).
4. Supabase's built-in mailer is rate limited (a few emails per hour). For real use, set up custom SMTP under **Authentication → Emails → SMTP Settings**.

## Routes

- `/` prompt screen · `/create` customize and generate · `/games/[id]` play and edit with chat (owner only)
- `/play/[id]` public player for shared games (anyone with the link) · `/my-games` your games, share link, QR, remix
- `/login`, `/signup` · `/auth/confirm` email verification callback
