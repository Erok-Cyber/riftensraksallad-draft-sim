-- Public reads are served by rift-team-roster; direct table access is service-only.
create table if not exists public.team_rosters (
 team_slug text primary key,
 payload jsonb,
 revision integer not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now()
);
alter table public.team_rosters enable row level security;
revoke all on public.team_rosters from public, anon, authenticated;
grant select, insert, update on public.team_rosters to service_role;
insert into public.team_rosters(team_slug) values ('riftensraksallad') on conflict do nothing;
