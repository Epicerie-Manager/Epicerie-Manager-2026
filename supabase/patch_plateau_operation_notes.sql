-- Création de la table des annotations Plateau et des droits d'accès

begin;

create extension if not exists pgcrypto;

create table if not exists public.plateau_operation_notes (
  op_id text primary key,
  note text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),

  constraint plateau_operation_notes_op_id_check
    check (length(trim(op_id)) > 0)
);

create index if not exists plateau_operation_notes_updated_at_idx
  on public.plateau_operation_notes (updated_at desc);

alter table public.plateau_operation_notes enable row level security;

grant select, insert, update, delete on public.plateau_operation_notes to authenticated;
grant all on public.plateau_operation_notes to service_role;

drop policy if exists read_plateau_operation_notes_authenticated on public.plateau_operation_notes;
create policy read_plateau_operation_notes_authenticated
on public.plateau_operation_notes
for select
to authenticated
using (true);

drop policy if exists write_plateau_operation_notes_manager on public.plateau_operation_notes;
create policy write_plateau_operation_notes_manager
on public.plateau_operation_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
  )
);

commit;
