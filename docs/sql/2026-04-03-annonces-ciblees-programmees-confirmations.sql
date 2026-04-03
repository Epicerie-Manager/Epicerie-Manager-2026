alter table public.annonces
add column if not exists publie_a_partir_de timestamptz null,
add column if not exists expire_le timestamptz null,
add column if not exists ciblage text not null default 'all',
add column if not exists target_employee_ids uuid[] not null default '{}',
add column if not exists target_rayons text[] not null default '{}',
add column if not exists confirmation_requise boolean not null default true;

alter table public.annonces
drop constraint if exists annonces_ciblage_check;

alter table public.annonces
add constraint annonces_ciblage_check
check (ciblage in ('all', 'employees', 'rayons'));

create table if not exists public.annonce_recipients (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.annonces(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  seen_at timestamptz null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (annonce_id, employee_id)
);

create index if not exists annonce_recipients_annonce_idx
on public.annonce_recipients (annonce_id);

create index if not exists annonce_recipients_employee_idx
on public.annonce_recipients (employee_id);

create index if not exists annonces_publish_window_idx
on public.annonces (publie_a_partir_de, expire_le);
