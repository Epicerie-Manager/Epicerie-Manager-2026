-- Patch SQL pour persister les seuils de presence partages
-- A executer dans Supabase SQL Editor

begin;

create table if not exists public.presence_thresholds (
  id text primary key,
  warning_morning integer not null default 12 check (warning_morning >= 0),
  critical_morning integer not null default 10 check (critical_morning >= 0),
  warning_afternoon integer not null default 2 check (warning_afternoon >= 0),
  critical_afternoon integer not null default 1 check (critical_afternoon >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.presence_thresholds (
  id,
  warning_morning,
  critical_morning,
  warning_afternoon,
  critical_afternoon
)
values ('global', 12, 10, 2, 1)
on conflict (id) do nothing;

alter table public.presence_thresholds enable row level security;

drop policy if exists "read_presence_thresholds_public" on public.presence_thresholds;
create policy "read_presence_thresholds_public"
on public.presence_thresholds
for select
to anon, authenticated
using (true);

drop policy if exists "write_presence_thresholds_manager" on public.presence_thresholds;
create policy "write_presence_thresholds_manager"
on public.presence_thresholds
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.presence_thresholds to anon, authenticated;
grant insert, update, delete on public.presence_thresholds to authenticated;
grant all on public.presence_thresholds to service_role;

commit;
