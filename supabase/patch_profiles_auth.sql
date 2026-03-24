-- Patch auth / profiles pour Epicerie Manager
-- Date: 2026-03-24
--
-- Objectifs:
-- 1) garantir la colonne public.profiles.password_changed
-- 2) garantir les policies RLS necessaires au flux de premiere connexion
-- 3) garantir le trigger de creation auto du profil depuis auth.users

begin;

alter table if exists public.profiles
  add column if not exists password_changed boolean default false;

alter table if exists public.profiles
  alter column password_changed set default false;

alter table if exists public.profiles enable row level security;

drop policy if exists "Lecture profil perso" on public.profiles;
create policy "Lecture profil perso"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Utilisateur modifie son propre profil" on public.profiles;
create policy "Utilisateur modifie son propre profil"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Manager voit tous les profils" on public.profiles;
create policy "Manager voit tous les profils"
on public.profiles
for select
to authenticated
using (public.is_manager());

drop policy if exists "Manager modifie les profils" on public.profiles;
create policy "Manager modifie les profils"
on public.profiles
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

grant usage on schema public to authenticated, service_role;
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, password_changed)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
