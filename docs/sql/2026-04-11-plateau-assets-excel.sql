begin;

alter table public.plateau_assets
  add column if not exists implantation_date date,
  add column if not exists desimplantation_date date,
  add column if not exists source_type text not null default 'pdf'
    check (source_type in ('pdf', 'excel'));

create index if not exists plateau_assets_implantation_idx
  on public.plateau_assets (implantation_date, desimplantation_date);

create table if not exists public.plateau_excel_sources (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null,
  implantation_date date not null,
  desimplantation_date date not null,
  file_path text not null,
  public_url text not null,
  source_name text not null default '',
  uploaded_by uuid references auth.users(id),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_number)
);

alter table public.plateau_excel_sources enable row level security;

drop policy if exists "read_plateau_excel_manager" on public.plateau_excel_sources;
create policy "read_plateau_excel_manager"
on public.plateau_excel_sources for select
to authenticated using (true);

drop policy if exists "write_plateau_excel_manager" on public.plateau_excel_sources;
create policy "write_plateau_excel_manager"
on public.plateau_excel_sources for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

grant select on public.plateau_excel_sources to anon;
grant select on public.plateau_excel_sources to authenticated;
grant all on public.plateau_excel_sources to service_role;

commit;
