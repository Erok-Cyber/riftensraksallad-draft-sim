-- Riftensräksallad shared match database
-- Run once in Supabase SQL editor (or provision via the Supabase ChatGPT integration).

create extension if not exists pgcrypto;
create schema if not exists app_private;

create table if not exists public.team_matches (
  id text primary key,
  team_slug text not null,
  saved_at timestamptz not null default now(),
  result text not null check (result in ('win','loss')),
  match_type text not null check (match_type in ('league','flex')),
  side text not null check (side in ('blue','red')),
  comp text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists team_matches_team_saved_idx
  on public.team_matches(team_slug, saved_at desc);

create table if not exists app_private.team_access (
  team_slug text primary key,
  key_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.team_matches enable row level security;

create or replace function public.rift_team_key_ok(p_team_slug text)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from app_private.team_access a
    where a.team_slug = p_team_slug
      and coalesce(
        current_setting('request.headers', true)::json ->> 'x-team-key',
        ''
      ) <> ''
      and a.key_hash = crypt(
        current_setting('request.headers', true)::json ->> 'x-team-key',
        a.key_hash
      )
  );
$$;

revoke all on function public.rift_team_key_ok(text) from public;
grant execute on function public.rift_team_key_ok(text) to anon, authenticated;

drop policy if exists team_matches_select on public.team_matches;
drop policy if exists team_matches_insert on public.team_matches;
drop policy if exists team_matches_update on public.team_matches;
drop policy if exists team_matches_delete on public.team_matches;

create policy team_matches_select
on public.team_matches for select
to anon, authenticated
using (public.rift_team_key_ok(team_slug));

create policy team_matches_insert
on public.team_matches for insert
to anon, authenticated
with check (public.rift_team_key_ok(team_slug));

create policy team_matches_update
on public.team_matches for update
to anon, authenticated
using (public.rift_team_key_ok(team_slug))
with check (public.rift_team_key_ok(team_slug));

create policy team_matches_delete
on public.team_matches for delete
to anon, authenticated
using (public.rift_team_key_ok(team_slug));

grant select, insert, update, delete on public.team_matches to anon, authenticated;

-- Provision the team access code separately; do NOT commit the real code.
-- Example (replace CHANGE_ME in the Supabase SQL editor only):
-- insert into app_private.team_access(team_slug,key_hash)
-- values ('riftensraksallad', crypt('CHANGE_ME', gen_salt('bf')))
-- on conflict(team_slug) do update
-- set key_hash=excluded.key_hash, updated_at=now();
