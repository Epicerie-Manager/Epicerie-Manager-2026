alter table public.employees
add column if not exists tg_rayons text[] not null default '{}';

comment on column public.employees.tg_rayons is
  'Rayons TG/GB dont le collaborateur est responsable par defaut.';

create index if not exists employees_tg_rayons_gin_idx
on public.employees
using gin (tg_rayons);
