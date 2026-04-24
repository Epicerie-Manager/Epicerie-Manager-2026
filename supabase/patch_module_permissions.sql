-- Patch SQL pour permissions bureau par module
-- Date: 2026-04-22
--
-- Objectifs:
-- 1) ajouter public.profiles.module_permissions (jsonb)
-- 2) retro-convertir les anciens profils limites depuis allowed_modules
-- 3) conserver la compatibilite avec les roles manager/admin existants

begin;

alter table if exists public.profiles
  add column if not exists module_permissions jsonb not null default '{}'::jsonb;

update public.profiles
set module_permissions = (
  select coalesce(
    jsonb_object_agg(
      module_key,
      case
        when lower(coalesce(public.profiles.role, '')) = 'gestionnaire' then 'write'
        else 'read'
      end
    ),
    '{}'::jsonb
  )
  from unnest(coalesce(public.profiles.allowed_modules, array[]::text[])) as module_key
)
where
  jsonb_typeof(coalesce(module_permissions, '{}'::jsonb)) = 'object'
  and module_permissions = '{}'::jsonb
  and coalesce(array_length(allowed_modules, 1), 0) > 0
  and lower(coalesce(role, '')) in ('bureau', 'collaborateur', 'viewer', 'gestionnaire');

comment on column public.profiles.module_permissions is
  'Permissions bureau par module: {"planning":"read","infos":"write"}';

commit;
