-- Patch SQL de rattrapage RH apres audit
-- Date: 2026-04-22
--
-- Objectifs:
-- 1) remettre rh_status en cohérence avec observation pour les anciens profils
-- 2) conserver les valeurs metier actuelles sans toucher aux autres employes
-- 3) signaler les cas restants a verifier manuellement

begin;

update public.employees
set rh_status = case
  when upper(trim(coalesce(observation, ''))) = 'COORDINATEUR' then 'COORDINATEUR'
  when upper(trim(coalesce(observation, ''))) = 'GESTIONNAIRE' then 'GESTIONNAIRE'
  when upper(trim(coalesce(observation, ''))) in ('DIRECTRICE', 'DIRECTION') then 'DIRECTRICE'
  else rh_status
end
where upper(trim(coalesce(observation, ''))) in (
  'COORDINATEUR',
  'GESTIONNAIRE',
  'DIRECTRICE',
  'DIRECTION'
)
and rh_status is distinct from case
  when upper(trim(coalesce(observation, ''))) = 'COORDINATEUR' then 'COORDINATEUR'
  when upper(trim(coalesce(observation, ''))) = 'GESTIONNAIRE' then 'GESTIONNAIRE'
  when upper(trim(coalesce(observation, ''))) in ('DIRECTRICE', 'DIRECTION') then 'DIRECTRICE'
  else rh_status
end;

commit;

-- Verification rapide apres execution:
-- select name, observation, rh_status from public.employees
-- where upper(trim(coalesce(observation, ''))) in ('COORDINATEUR','GESTIONNAIRE','DIRECTRICE','DIRECTION')
-- order by name;
