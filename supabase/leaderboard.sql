-- Glizzy Gobbler world leaderboard.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  name       text        not null check (name ~ '^[A-Z0-9 _.!?-]{1,10}$'),
  score      integer     not null check (score > 0),
  wave       integer     not null check (wave between 1 and 1000),
  created_at timestamptz not null default now(),
  -- basic sanity check: no wave can be worth more than this many points
  constraint plausible_score check (score <= wave * 150000)
);

create index if not exists scores_score_idx on public.scores (score desc, created_at asc);

-- Players may only read the board and add new scores (no edits, no deletes).
alter table public.scores enable row level security;

drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores
  for select to anon, authenticated using (true);

drop policy if exists "anyone can add a score" on public.scores;
create policy "anyone can add a score" on public.scores
  for insert to anon, authenticated with check (true);

grant select, insert on public.scores to anon, authenticated;
