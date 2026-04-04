create extension if not exists pgcrypto with schema extensions;

create table if not exists public.manager_mobile_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null unique,
  slug text not null unique,
  display_name text not null,
  initials text not null default 'EM',
  pin_hash text not null,
  first_login boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_manager_mobile_access()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_manager_mobile_access_updated_at on public.manager_mobile_access;
create trigger trg_manager_mobile_access_updated_at
before update on public.manager_mobile_access
for each row
execute function public.set_updated_at_manager_mobile_access();

alter table public.manager_mobile_access enable row level security;

drop policy if exists "manager_mobile_access_select_none" on public.manager_mobile_access;
create policy "manager_mobile_access_select_none"
on public.manager_mobile_access
for select
to authenticated
using (false);

drop policy if exists "manager_mobile_access_write_none" on public.manager_mobile_access;
create policy "manager_mobile_access_write_none"
on public.manager_mobile_access
for all
to authenticated
using (false)
with check (false);

create or replace function public.verify_manager_mobile_pin(p_slug text, p_pin text)
returns table (
  email text,
  display_name text,
  first_login boolean
)
language sql
security definer
set search_path = public
as $$
  select
    mma.email,
    mma.display_name,
    mma.first_login
  from public.manager_mobile_access mma
  where mma.is_active = true
    and lower(mma.slug) = lower(trim(p_slug))
    and mma.pin_hash = extensions.crypt(trim(p_pin), mma.pin_hash)
  limit 1;
$$;

revoke all on function public.verify_manager_mobile_pin(text, text) from public;
grant execute on function public.verify_manager_mobile_pin(text, text) to anon, authenticated;

comment on table public.manager_mobile_access is 'Acces PIN dedie a l application manager mobile.';

-- Exemples a adapter :
-- insert into public.manager_mobile_access (user_id, email, slug, display_name, initials, pin_hash, first_login, is_active, sort_order)
-- values
-- ('UUID_PROFIL_RACHID', 'rachid@ep.fr', 'rachid', 'Rachid BEN DAOUD', 'RB', extensions.crypt('123456', extensions.gen_salt('bf')), false, true, 10),
-- ('UUID_PROFIL_FARIDA', 'farida@ep.fr', 'farida', 'Farida BEN DAOUD', 'FB', extensions.crypt('123456', extensions.gen_salt('bf')), false, true, 20);

-- Pour changer un PIN :
-- update public.manager_mobile_access
-- set pin_hash = extensions.crypt('654321', extensions.gen_salt('bf')), first_login = false
-- where slug = 'rachid';
