-- Creation de la table des notes manager et des droits d'acces

begin;

create extension if not exists pgcrypto;

create table if not exists public.manager_notes (
  id uuid primary key default gen_random_uuid(),
  note text not null,
  author_name text not null default 'Manager',
  created_by uuid references auth.users(id) on delete set null,
  entry_type text not null default 'note',
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),

  constraint manager_notes_entry_type_check
    check (entry_type in ('note', 'task')),
  constraint manager_notes_note_check
    check (length(trim(note)) > 0)
);

alter table public.manager_notes
  add column if not exists entry_type text not null default 'note';

alter table public.manager_notes
  add column if not exists is_done boolean not null default false;

alter table public.manager_notes
  add column if not exists done_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manager_notes_entry_type_check'
  ) then
    alter table public.manager_notes
      add constraint manager_notes_entry_type_check
      check (entry_type in ('note', 'task'));
  end if;
end $$;

create index if not exists manager_notes_created_at_idx
  on public.manager_notes (created_at desc);

create index if not exists manager_notes_is_done_idx
  on public.manager_notes (is_done, created_at desc);

alter table public.manager_notes enable row level security;

grant select, insert, update, delete on public.manager_notes to authenticated;
grant all on public.manager_notes to service_role;

drop policy if exists read_manager_notes_authenticated on public.manager_notes;
create policy read_manager_notes_authenticated
on public.manager_notes
for select
to authenticated
using (true);

drop policy if exists insert_manager_notes_manager on public.manager_notes;
create policy insert_manager_notes_manager
on public.manager_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
  )
);

drop policy if exists update_manager_notes_manager on public.manager_notes;
create policy update_manager_notes_manager
on public.manager_notes
for update
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

drop policy if exists delete_manager_notes_manager on public.manager_notes;
create policy delete_manager_notes_manager
on public.manager_notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
  )
);

commit;
