-- Riftensräksallad shared match database (Supabase)
-- Production architecture uses the rift-team-matches Edge Function as the only browser-facing API.

create extension if not exists pgcrypto with schema extensions;
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
revoke all on public.team_matches from anon, authenticated;
grant select, insert, update, delete on public.team_matches to service_role;

create or replace function public.verify_team_key_service(p_team_slug text, p_team_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.team_access a
    where a.team_slug = p_team_slug
      and coalesce(p_team_key,'') <> ''
      and a.key_hash = extensions.crypt(p_team_key, a.key_hash)
  );
$$;

revoke all on function public.verify_team_key_service(text,text) from public;
revoke execute on function public.verify_team_key_service(text,text) from anon, authenticated;
grant execute on function public.verify_team_key_service(text,text) to service_role;

-- Provision the real team code only in Supabase, never in GitHub:
-- insert into app_private.team_access(team_slug,key_hash)
-- values ('riftensraksallad', extensions.crypt('CHANGE_ME', extensions.gen_salt('bf')))
-- on conflict(team_slug) do update
-- set key_hash=excluded.key_hash, updated_at=now();
