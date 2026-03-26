-- Patch SQL pour aligner cycle_repos avec le modele RH 5 semaines
-- A executer dans Supabase SQL Editor

begin;

alter table if exists public.cycle_repos
  drop constraint if exists cycle_repos_semaine_cycle_check;

alter table if exists public.cycle_repos
  add constraint cycle_repos_semaine_cycle_check
  check (semaine_cycle between 1 and 5);

commit;

-- Diagnostic apres patch
-- select employee_id, count(*) as nb_semaines
-- from public.cycle_repos
-- group by employee_id
-- order by nb_semaines asc, employee_id asc;

