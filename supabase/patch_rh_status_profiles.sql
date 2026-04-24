-- Patch SQL RH status profiles
-- Date: 2026-04-22
--
-- Objectifs:
-- 1) normaliser employees.rh_status vers des valeurs canoniques durables
-- 2) accepter les nouveaux profils RH metier
-- 3) rendre la DB tolerante aux labels frontend (Collaborateur, Coordinateur, Gestionnaire)

begin;

create or replace function public.normalize_employee_rh_status(input_status text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := upper(trim(coalesce(input_status, '')));

  if normalized = '' then
    return 'COLLABORATEUR';
  end if;

  if normalized in ('COLLABORATEUR', 'COLLABORATEURS') then
    return 'COLLABORATEUR';
  end if;

  if normalized in ('COORDINATEUR', 'COORDINATEURS', 'RESPONSABLE_RAYON', 'RESPONSABLE RAYON') then
    return 'COORDINATEUR';
  end if;

  if normalized in ('GESTIONNAIRE', 'GESTIONNAIRES') then
    return 'GESTIONNAIRE';
  end if;

  if normalized in ('DIRECTRICE', 'DIRECTION') then
    return 'DIRECTRICE';
  end if;

  return normalized;
end;
$$;

create or replace function public.set_employee_rh_status()
returns trigger
language plpgsql
as $$
begin
  new.rh_status := public.normalize_employee_rh_status(new.rh_status);
  return new;
end;
$$;

update public.employees
set rh_status = public.normalize_employee_rh_status(coalesce(rh_status, observation))
where coalesce(rh_status, '') <> public.normalize_employee_rh_status(coalesce(rh_status, observation));

alter table public.employees
  drop constraint if exists employees_rh_status_check;

alter table public.employees
  add constraint employees_rh_status_check
  check (rh_status = any (array[
    'COLLABORATEUR'::text,
    'COORDINATEUR'::text,
    'GESTIONNAIRE'::text,
    'DIRECTRICE'::text
  ]));

drop trigger if exists trg_set_employee_rh_status on public.employees;

create trigger trg_set_employee_rh_status
before insert or update of rh_status
on public.employees
for each row
execute function public.set_employee_rh_status();

comment on function public.normalize_employee_rh_status(text) is
  'Normalise les labels RH frontend vers les statuts canoniques employees.rh_status.';

commit;
