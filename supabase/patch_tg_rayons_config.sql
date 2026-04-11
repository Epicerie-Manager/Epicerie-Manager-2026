-- Patch SQL pour persister la configuration partagee de PlantTG
-- A executer dans Supabase SQL Editor

begin;

create table if not exists public.tg_rayons_config (
  rayon text primary key,
  family text not null check (family in ('SALE', 'SUCRE')),
  order_index integer not null check (order_index > 0),
  active boolean not null default true,
  start_week_id text null,
  default_responsible text null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tg_custom_mechanics (
  name text primary key,
  order_index integer not null check (order_index > 0),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.tg_rayons_config (
  rayon,
  family,
  order_index,
  active,
  start_week_id,
  default_responsible
)
values
  ('BIO 1', 'SALE', 10, true, null, 'KAMEL'),
  ('BIO 2', 'SALE', 20, true, null, 'KAMEL'),
  ('CHIPS', 'SALE', 30, true, null, 'MOHAMED'),
  ('PDM 1', 'SALE', 40, true, null, 'ROSALIE'),
  ('PDM 2', 'SALE', 50, true, null, 'ROSALIE'),
  ('SOUPE / POISSON', 'SALE', 60, true, null, 'JEREMY'),
  ('CONS. LEGUMES', 'SALE', 70, true, null, 'JEREMY'),
  ('PÂTES / SAUCES', 'SALE', 80, true, null, 'MOHCINE'),
  ('CONDIMENTS', 'SALE', 90, true, null, 'LIYAKATH'),
  ('HUILES / EPICES', 'SALE', 100, true, null, 'LIYAKATH'),
  ('AIDE A LA PATISSERIE / SUCRE FARINE', 'SUCRE', 110, true, null, 'WASIM'),
  ('PATISSERIE', 'SUCRE', 120, true, null, 'EL HASSANE'),
  ('BISCUIT', 'SUCRE', 130, true, null, 'EL HASSANE'),
  ('CHOCOLAT & CONFISERIE', 'SUCRE', 140, true, null, 'CECILE'),
  ('COMPOTE / TARTINABLE', 'SUCRE', 150, true, null, 'WASIM'),
  ('PAIN DE MIE / VIENNOISERIE', 'SUCRE', 160, true, null, 'PASCALE'),
  ('CEREALES / BISCOTTES', 'SUCRE', 170, true, null, 'MOHAMED'),
  ('CAFE', 'SUCRE', 180, true, null, 'JAMAA'),
  ('THE / POUDRE CHOCOLAT', 'SUCRE', 190, true, null, 'JAMAA'),
  ('ANIMALERIE', 'SUCRE', 200, true, null, 'CECILE')
on conflict (rayon) do nothing;

alter table public.tg_rayons_config enable row level security;
alter table public.tg_custom_mechanics enable row level security;

drop policy if exists "read_tg_rayons_config_public" on public.tg_rayons_config;
create policy "read_tg_rayons_config_public"
on public.tg_rayons_config
for select
to anon, authenticated
using (true);

drop policy if exists "write_tg_rayons_config_manager" on public.tg_rayons_config;
create policy "write_tg_rayons_config_manager"
on public.tg_rayons_config
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

drop policy if exists "read_tg_custom_mechanics_public" on public.tg_custom_mechanics;
create policy "read_tg_custom_mechanics_public"
on public.tg_custom_mechanics
for select
to anon, authenticated
using (true);

drop policy if exists "write_tg_custom_mechanics_manager" on public.tg_custom_mechanics;
create policy "write_tg_custom_mechanics_manager"
on public.tg_custom_mechanics
for all
to authenticated
using (public.is_manager())
with check (public.is_manager());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.tg_rayons_config, public.tg_custom_mechanics to anon, authenticated;
grant insert, update, delete on public.tg_rayons_config, public.tg_custom_mechanics to authenticated;
grant all on public.tg_rayons_config, public.tg_custom_mechanics to service_role;

commit;
