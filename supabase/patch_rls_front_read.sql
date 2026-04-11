-- Patch RLS / grants for Epicerie Manager frontend reads
-- Date: 2026-03-24
--
-- Goal:
-- 1) Let frontend (anon key) read business tables used by the app.
-- 2) Keep writes restricted to manager/service role.
--
-- Notes:
-- - This script assumes public.is_manager() exists (as described in project docs).
-- - Service role bypasses RLS by default, but grants are still added for clarity.

begin;

-- Tables consumed by frontend stores/pages
alter table if exists public.employees enable row level security;
alter table if exists public.planning_entries enable row level security;
alter table if exists public.cycle_repos enable row level security;
alter table if exists public.binomes_repos enable row level security;
alter table if exists public.tri_caddie enable row level security;
alter table if exists public.plans_tg enable row level security;
alter table if exists public.plans_tg_entries enable row level security;
alter table if exists public.tg_rayons_config enable row level security;
alter table if exists public.tg_custom_mechanics enable row level security;
alter table if exists public.balisage_mensuel enable row level security;
alter table if exists public.absences enable row level security;
alter table if exists public.documents enable row level security;
alter table if exists public.annonces enable row level security;

-- Read policies (anon + authenticated)
drop policy if exists "read_employees_public" on public.employees;
create policy "read_employees_public"
on public.employees
for select
to anon, authenticated
using (true);

drop policy if exists "read_planning_entries_public" on public.planning_entries;
create policy "read_planning_entries_public"
on public.planning_entries
for select
to anon, authenticated
using (true);

drop policy if exists "read_cycle_repos_public" on public.cycle_repos;
create policy "read_cycle_repos_public"
on public.cycle_repos
for select
to anon, authenticated
using (true);

drop policy if exists "read_binomes_repos_public" on public.binomes_repos;
create policy "read_binomes_repos_public"
on public.binomes_repos
for select
to anon, authenticated
using (true);

drop policy if exists "read_tri_caddie_public" on public.tri_caddie;
create policy "read_tri_caddie_public"
on public.tri_caddie
for select
to anon, authenticated
using (true);

drop policy if exists "read_plans_tg_public" on public.plans_tg;
create policy "read_plans_tg_public"
on public.plans_tg
for select
to anon, authenticated
using (true);

drop policy if exists "read_plans_tg_entries_public" on public.plans_tg_entries;
create policy "read_plans_tg_entries_public"
on public.plans_tg_entries
for select
to anon, authenticated
using (true);

drop policy if exists "read_tg_rayons_config_public" on public.tg_rayons_config;
create policy "read_tg_rayons_config_public"
on public.tg_rayons_config
for select
to anon, authenticated
using (true);

drop policy if exists "read_tg_custom_mechanics_public" on public.tg_custom_mechanics;
create policy "read_tg_custom_mechanics_public"
on public.tg_custom_mechanics
for select
to anon, authenticated
using (true);

drop policy if exists "read_balisage_public" on public.balisage_mensuel;
create policy "read_balisage_public"
on public.balisage_mensuel
for select
to anon, authenticated
using (true);

drop policy if exists "read_absences_public" on public.absences;
create policy "read_absences_public"
on public.absences
for select
to anon, authenticated
using (true);

drop policy if exists "read_documents_public" on public.documents;
create policy "read_documents_public"
on public.documents
for select
to anon, authenticated
using (true);

drop policy if exists "read_annonces_public" on public.annonces;
create policy "read_annonces_public"
on public.annonces
for select
to anon, authenticated
using (true);

-- Manager write policies (authenticated manager only)
-- employees
drop policy if exists "write_employees_manager" on public.employees;
create policy "write_employees_manager"
on public.employees
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- planning_entries
drop policy if exists "write_planning_entries_manager" on public.planning_entries;
create policy "write_planning_entries_manager"
on public.planning_entries
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- cycle_repos
drop policy if exists "write_cycle_repos_manager" on public.cycle_repos;
create policy "write_cycle_repos_manager"
on public.cycle_repos
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- binomes_repos
drop policy if exists "write_binomes_repos_manager" on public.binomes_repos;
create policy "write_binomes_repos_manager"
on public.binomes_repos
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- tri_caddie
drop policy if exists "write_tri_caddie_manager" on public.tri_caddie;
create policy "write_tri_caddie_manager"
on public.tri_caddie
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- plans_tg
drop policy if exists "write_plans_tg_manager" on public.plans_tg;
create policy "write_plans_tg_manager"
on public.plans_tg
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- plans_tg_entries
drop policy if exists "write_plans_tg_entries_manager" on public.plans_tg_entries;
create policy "write_plans_tg_entries_manager"
on public.plans_tg_entries
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- tg_rayons_config
drop policy if exists "write_tg_rayons_config_manager" on public.tg_rayons_config;
create policy "write_tg_rayons_config_manager"
on public.tg_rayons_config
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- tg_custom_mechanics
drop policy if exists "write_tg_custom_mechanics_manager" on public.tg_custom_mechanics;
create policy "write_tg_custom_mechanics_manager"
on public.tg_custom_mechanics
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- balisage_mensuel
drop policy if exists "write_balisage_manager" on public.balisage_mensuel;
create policy "write_balisage_manager"
on public.balisage_mensuel
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- absences
drop policy if exists "write_absences_manager" on public.absences;
create policy "write_absences_manager"
on public.absences
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- documents
drop policy if exists "write_documents_manager" on public.documents;
create policy "write_documents_manager"
on public.documents
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- annonces
drop policy if exists "write_annonces_manager" on public.annonces;
create policy "write_annonces_manager"
on public.annonces
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

-- Explicit grants (if missing)
grant usage on schema public to anon, authenticated, service_role;
grant select on table
  public.employees,
  public.planning_entries,
  public.cycle_repos,
  public.binomes_repos,
  public.tri_caddie,
  public.plans_tg,
  public.plans_tg_entries,
  public.tg_rayons_config,
  public.tg_custom_mechanics,
  public.balisage_mensuel,
  public.absences,
  public.documents,
  public.annonces
to anon, authenticated;

grant all on table
  public.employees,
  public.planning_entries,
  public.cycle_repos,
  public.binomes_repos,
  public.tri_caddie,
  public.plans_tg,
  public.plans_tg_entries,
  public.tg_rayons_config,
  public.tg_custom_mechanics,
  public.balisage_mensuel,
  public.absences,
  public.documents,
  public.annonces
to service_role;

commit;
