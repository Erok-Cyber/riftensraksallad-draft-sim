-- Additive hardening; preserves all existing match payloads and permissions.
set lock_timeout = '5s';
alter table public.team_matches add column if not exists deleted_at timestamptz;
create or replace function public.guard_deleted_team_match()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.deleted_at is not null then
    raise exception 'MATCH_DELETED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_deleted_team_match() from public, anon, authenticated;
create or replace trigger guard_deleted_team_match
before update on public.team_matches for each row
execute function public.guard_deleted_team_match();
