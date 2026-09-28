-- Riftensräksallad shared match database (Supabase)
-- Browser clients never receive direct table permissions.
-- All reads/writes go through security-definer RPC functions that verify the team code.

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
revoke all on public.team_matches from anon, authenticated;

create or replace function app_private.rift_key_ok(p_team_slug text, p_team_key text)
returns boolean
language sql
stable
security definer
set search_path = app_private, public
as $$
  select exists (
    select 1
    from app_private.team_access a
    where a.team_slug = p_team_slug
      and coalesce(p_team_key,'') <> ''
      and a.key_hash = crypt(p_team_key, a.key_hash)
  );
$$;

revoke all on function app_private.rift_key_ok(text,text) from public;

create or replace function public.rift_list_matches(
  p_team_slug text,
  p_team_key text
)
returns table (
  id text,
  saved_at timestamptz,
  result text,
  match_type text,
  side text,
  comp text,
  payload jsonb
)
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.rift_key_ok(p_team_slug,p_team_key) then
    raise exception 'invalid team code' using errcode='28000';
  end if;

  return query
  select m.id,m.saved_at,m.result,m.match_type,m.side,m.comp,m.payload
  from public.team_matches m
  where m.team_slug=p_team_slug
  order by m.saved_at asc
  limit 250;
end;
$$;

create or replace function public.rift_upsert_match(
  p_team_slug text,
  p_team_key text,
  p_match jsonb
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_result text := p_match->>'result';
  v_type text := p_match->>'matchType';
  v_side text := p_match->>'side';
begin
  if not app_private.rift_key_ok(p_team_slug,p_team_key) then
    raise exception 'invalid team code' using errcode='28000';
  end if;
  if v_result not in ('win','loss') or v_type not in ('league','flex') or v_side not in ('blue','red') then
    raise exception 'invalid match payload';
  end if;

  insert into public.team_matches(id,team_slug,saved_at,result,match_type,side,comp,payload)
  values (
    p_match->>'id',
    p_team_slug,
    coalesce((p_match->>'savedAt')::timestamptz,now()),
    v_result,v_type,v_side,p_match->>'comp',p_match
  )
  on conflict(id) do update set
    saved_at=excluded.saved_at,
    result=excluded.result,
    match_type=excluded.match_type,
    side=excluded.side,
    comp=excluded.comp,
    payload=excluded.payload;
end;
$$;

create or replace function public.rift_delete_match(
  p_team_slug text,
  p_team_key text,
  p_match_id text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if not app_private.rift_key_ok(p_team_slug,p_team_key) then
    raise exception 'invalid team code' using errcode='28000';
  end if;
  delete from public.team_matches
  where team_slug=p_team_slug and id=p_match_id;
end;
$$;

revoke all on function public.rift_list_matches(text,text) from public;
revoke all on function public.rift_upsert_match(text,text,jsonb) from public;
revoke all on function public.rift_delete_match(text,text,text) from public;

grant execute on function public.rift_list_matches(text,text) to anon, authenticated;
grant execute on function public.rift_upsert_match(text,text,jsonb) to anon, authenticated;
grant execute on function public.rift_delete_match(text,text,text) to anon, authenticated;

-- Provision the real team code only inside Supabase; never commit it.
-- Example:
-- insert into app_private.team_access(team_slug,key_hash)
-- values ('riftensraksallad', crypt('CHANGE_ME', gen_salt('bf')))
-- on conflict(team_slug) do update
-- set key_hash=excluded.key_hash, updated_at=now();
