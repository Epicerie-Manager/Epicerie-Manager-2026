begin;

create extension if not exists pgcrypto;

create table if not exists public.employee_followups (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  manager_user_id uuid null references auth.users(id) on delete set null,
  followup_type text not null default 'metre_a_metre',
  audit_date date not null,
  rayon text not null default '',
  manager_name text not null default '',
  collaborator_name text not null default '',
  global_score numeric(5,2) not null default 0,
  summary text not null default '',
  progress_axes text not null default '',
  manager_signature_data_url text null,
  collaborator_signature_data_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint employee_followups_followup_type_check
    check (followup_type in ('metre_a_metre')),
  constraint employee_followups_rayon_check
    check (length(trim(rayon)) > 0),
  constraint employee_followups_manager_name_check
    check (length(trim(manager_name)) > 0),
  constraint employee_followups_collaborator_name_check
    check (length(trim(collaborator_name)) > 0),
  constraint employee_followups_global_score_check
    check (global_score >= 0 and global_score <= 100)
);

create table if not exists public.employee_followup_sections (
  id uuid primary key default gen_random_uuid(),
  followup_id uuid not null references public.employee_followups(id) on delete cascade,
  section_key text not null,
  section_label text not null,
  section_type text not null,
  coefficient numeric(5,2) not null default 0,
  score numeric(5,2) not null default 0,
  comment text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint employee_followup_sections_section_key_check
    check (
      section_key in (
        'presentation_rayon',
        'balisage_signaletique',
        'ruptures_fraicheur',
        'reserve_logistique',
        'epi'
      )
    ),
  constraint employee_followup_sections_section_type_check
    check (section_type in ('rating', 'boolean')),
  constraint employee_followup_sections_coefficient_check
    check (coefficient >= 0 and coefficient <= 100),
  constraint employee_followup_sections_score_check
    check (score >= 0 and score <= 100),
  unique (followup_id, section_key)
);

create table if not exists public.employee_followup_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.employee_followup_sections(id) on delete cascade,
  item_key text not null,
  item_label text not null,
  item_type text not null,
  expected_answer text null,
  boolean_answer text null,
  rating_value integer null,
  score_value numeric(5,2) not null default 0,
  comment text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint employee_followup_items_item_type_check
    check (item_type in ('rating', 'boolean')),
  constraint employee_followup_items_expected_answer_check
    check (expected_answer is null or expected_answer in ('OUI', 'NON')),
  constraint employee_followup_items_boolean_answer_check
    check (boolean_answer is null or boolean_answer in ('OUI', 'NON')),
  constraint employee_followup_items_rating_value_check
    check (rating_value is null or (rating_value >= 0 and rating_value <= 5)),
  constraint employee_followup_items_score_value_check
    check (score_value >= 0 and score_value <= 100),
  unique (section_id, item_key)
);

create index if not exists employee_followups_employee_idx
  on public.employee_followups (employee_id, audit_date desc);

create index if not exists employee_followups_type_idx
  on public.employee_followups (followup_type, audit_date desc);

create index if not exists employee_followups_updated_at_idx
  on public.employee_followups (updated_at desc);

create index if not exists employee_followup_sections_followup_idx
  on public.employee_followup_sections (followup_id, sort_order);

create index if not exists employee_followup_items_section_idx
  on public.employee_followup_items (section_id, sort_order);

create or replace function public.touch_employee_followups_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employee_followups_updated_at on public.employee_followups;
create trigger set_employee_followups_updated_at
before update on public.employee_followups
for each row execute function public.touch_employee_followups_updated_at();

alter table public.employee_followups enable row level security;
alter table public.employee_followup_sections enable row level security;
alter table public.employee_followup_items enable row level security;

grant select, insert, update, delete on public.employee_followups to authenticated;
grant select, insert, update, delete on public.employee_followup_sections to authenticated;
grant select, insert, update, delete on public.employee_followup_items to authenticated;

grant all on public.employee_followups to service_role;
grant all on public.employee_followup_sections to service_role;
grant all on public.employee_followup_items to service_role;

drop policy if exists employee_followups_read_manager on public.employee_followups;
create policy employee_followups_read_manager
on public.employee_followups
for select
to authenticated
using (public.is_manager());

drop policy if exists employee_followups_write_manager on public.employee_followups;
create policy employee_followups_write_manager
on public.employee_followups
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists employee_followup_sections_read_manager on public.employee_followup_sections;
create policy employee_followup_sections_read_manager
on public.employee_followup_sections
for select
to authenticated
using (
  public.is_manager()
  and exists (
    select 1
    from public.employee_followups f
    where f.id = followup_id
  )
);

drop policy if exists employee_followup_sections_write_manager on public.employee_followup_sections;
create policy employee_followup_sections_write_manager
on public.employee_followup_sections
for all
to authenticated
using (
  public.is_manager()
  and exists (
    select 1
    from public.employee_followups f
    where f.id = followup_id
  )
)
with check (
  public.is_manager()
  and exists (
    select 1
    from public.employee_followups f
    where f.id = followup_id
  )
);

drop policy if exists employee_followup_items_read_manager on public.employee_followup_items;
create policy employee_followup_items_read_manager
on public.employee_followup_items
for select
to authenticated
using (
  public.is_manager()
  and exists (
    select 1
    from public.employee_followup_sections s
    where s.id = section_id
  )
);

drop policy if exists employee_followup_items_write_manager on public.employee_followup_items;
create policy employee_followup_items_write_manager
on public.employee_followup_items
for all
to authenticated
using (
  public.is_manager()
  and exists (
    select 1
    from public.employee_followup_sections s
    where s.id = section_id
  )
)
with check (
  public.is_manager()
  and exists (
    select 1
    from public.employee_followup_sections s
    where s.id = section_id
  )
);

comment on table public.employee_followups is
  'Suivi collaborateur: en-tête d’un audit terrain, initialement pour la fiche Mètre à mètre.';

comment on table public.employee_followup_sections is
  'Sections d’un audit collaborateur avec coefficient, score et commentaire.';

comment on table public.employee_followup_items is
  'Points de contrôle détaillés d’une section de suivi collaborateur.';

commit;
