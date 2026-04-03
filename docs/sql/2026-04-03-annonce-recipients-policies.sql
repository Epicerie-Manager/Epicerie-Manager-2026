grant select, insert, update, delete on table public.annonce_recipients to authenticated;

alter table public.annonce_recipients enable row level security;

drop policy if exists "Managers can manage annonce recipients" on public.annonce_recipients;
create policy "Managers can manage annonce recipients"
on public.annonce_recipients
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(coalesce(profiles.role, '')) in ('manager', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(coalesce(profiles.role, '')) in ('manager', 'admin')
  )
);

drop policy if exists "Collaborators can read their annonce recipients" on public.annonce_recipients;
create policy "Collaborators can read their annonce recipients"
on public.annonce_recipients
for select
to authenticated
using (
  employee_id in (
    select profiles.employee_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "Collaborators can update their annonce recipients" on public.annonce_recipients;
create policy "Collaborators can update their annonce recipients"
on public.annonce_recipients
for update
to authenticated
using (
  employee_id in (
    select profiles.employee_id
    from public.profiles
    where profiles.id = auth.uid()
  )
)
with check (
  employee_id in (
    select profiles.employee_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "Collaborators can insert their annonce recipients" on public.annonce_recipients;
create policy "Collaborators can insert their annonce recipients"
on public.annonce_recipients
for insert
to authenticated
with check (
  employee_id in (
    select profiles.employee_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);
