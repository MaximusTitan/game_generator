-- Game Genie schema. Run in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  type         text not null check (type in ('quiz', 'race', 'catch', 'memory')),
  prompt       text not null default '',
  spec         jsonb not null,
  is_public    boolean not null default true,
  remixed_from uuid references public.games (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists games_user_id_idx on public.games (user_id, updated_at desc);

alter table public.games enable row level security;

-- Owners can do everything with their own games.
create policy "owners read own games" on public.games
  for select using (auth.uid() = user_id);
create policy "owners insert own games" on public.games
  for insert with check (auth.uid() = user_id);
create policy "owners update own games" on public.games
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners delete own games" on public.games
  for delete using (auth.uid() = user_id);

-- Anyone with the link can play (and remix) a public game.
create policy "anyone reads public games" on public.games
  for select using (is_public);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at
  before update on public.games
  for each row execute function public.touch_updated_at();
