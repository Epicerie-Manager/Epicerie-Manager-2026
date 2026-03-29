-- Mise a jour de la table des annotations Plateau pour les lier a la semaine, au plateau et a l'operation

begin;

alter table public.plateau_operation_notes
  add column if not exists week_number integer,
  add column if not exists plateau_key text;

update public.plateau_operation_notes
set plateau_key = case
  when lower(op_id) like 'a%' then 'A'
  when lower(op_id) like 'b%' then 'B'
  when lower(op_id) like 'c%' then 'C'
  else 'WEEK'
end
where plateau_key is null;

update public.plateau_operation_notes
set week_number = case op_id
  when 'a1' then 10
  when 'a2' then 11
  when 'a3' then 12
  when 'a4' then 12
  when 'a5' then 14
  when 'a6' then 15
  when 'a7' then 18
  when 'a8' then 20
  when 'a9' then 21
  when 'a10' then 24
  when 'a11' then 25
  when 'b1' then 10
  when 'b2' then 10
  when 'b3' then 12
  when 'b4' then 15
  when 'b5' then 21
  when 'c1' then 10
  when 'c2' then 11
  when 'c3' then 13
  when 'c4' then 14
  when 'c5' then 15
  when 'c6' then 16
  when 'c7' then 17
  when 'c8' then 20
  when 'c9' then 23
  else 1
end
where week_number is null;

alter table public.plateau_operation_notes
  alter column week_number set not null,
  alter column plateau_key set not null;

alter table public.plateau_operation_notes
  drop constraint if exists plateau_operation_notes_pkey;

alter table public.plateau_operation_notes
  add constraint plateau_operation_notes_pkey primary key (week_number, plateau_key, op_id);

alter table public.plateau_operation_notes
  drop constraint if exists plateau_operation_notes_week_number_check;

alter table public.plateau_operation_notes
  add constraint plateau_operation_notes_week_number_check
  check (week_number between 1 and 53);

alter table public.plateau_operation_notes
  drop constraint if exists plateau_operation_notes_plateau_key_check;

alter table public.plateau_operation_notes
  add constraint plateau_operation_notes_plateau_key_check
  check (plateau_key in ('A', 'B', 'C', 'WEEK'));

create index if not exists plateau_operation_notes_context_idx
  on public.plateau_operation_notes (week_number, plateau_key, updated_at desc);

commit;
